"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { m } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Building2, MapPin, Phone, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowLeft, Edit2 } from "lucide-react"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp } from "@/components/motion/variants"
import { SolarBackground, AuthBrandPanel, AuthMobileBrand, useAuthBackground } from "@/components/auth/auth-visuals"
import { cn } from "@/lib/utils"
import { publicRegisterSchema } from "@/lib/validations"
import type { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { PasswordStrengthIndicator } from "@/components/ui/password-strength"
import { validatePassword } from "@/lib/password-validation"
import { LocationPicker } from "@/components/ui/location-picker"

type RegisterForm = z.infer<typeof publicRegisterSchema>

type Step = 1 | 2 | 3 | 4 | 5

const steps = [
  { number: 1, title: 'Account', icon: Mail, description: 'Email & password' },
  { number: 2, title: 'Facility Info', icon: Building2, description: 'Facility details' },
  { number: 3, title: 'Review', icon: CheckCircle2, description: 'Review and submit' },
]

const STORAGE_KEY = 'facility_signup_state'

interface SignupState {
  currentStep: Step
  email: string
  timestamp: number
}

export default function SignUpPage() {
  const router = useRouter()
  
  // Initialize state from localStorage if available
  const getInitialState = (): SignupState | null => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state: SignupState = JSON.parse(stored)
        // Check if state is still valid (not older than 1 hour)
        const oneHour = 60 * 60 * 1000
        if (Date.now() - state.timestamp < oneHour) {
          return state
        } else {
          // Clear expired state
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Error reading signup state from localStorage:', error)
    }
    return null
  }

  const initialState = getInitialState()
  const [currentStep, setCurrentStep] = useState<Step>(initialState?.currentStep || 1)
  const [isLoading, setIsLoading] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordValidationErrors, setPasswordValidationErrors] = useState<string[]>([])
  const emailRef = useRef<string>(initialState?.email || '')
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([])
  const [districts, setDistricts] = useState<Array<{ id: number; name: string; regionId: number }>>([])
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)
  const [selectedRegionId, setSelectedRegionId] = useState<string>('')
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [phoneDuplicate, setPhoneDuplicate] = useState(false)
  const [emailDuplicate, setEmailDuplicate] = useState(false)
  const [duplicateDetails, setDuplicateDetails] = useState<any>(null)
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)

  // Animated solar background (shared with the sign-in page)
  const { bgIndex, setBgIndex, reduce } = useAuthBackground()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<RegisterForm>({
    resolver: zodResolver(publicRegisterSchema),
    mode: 'onChange', // Change to onChange for real-time validation
    defaultValues: {
      name: '', // Will be set to facility name later
      email: '',
      phone: '+255 ', // Phone required
      password: '', // Add password to form default values
      facilityInfo: {
        name: '',
        address: '', // Optional - no default value
        phone: '+255 ',
        city: '',
        region: '',
        regionId: undefined,
        districtId: undefined,
        email: '', // Email for facility info (will be synced from main email)
      },
    },
  })

  // Debug: Log form errors
  const watchedValues = watch()


  // Update name field when facility name changes (for validation)
  // This ensures the name field is always synced with facility name
  useEffect(() => {
    if (watchedValues.facilityInfo?.name && watchedValues.facilityInfo.name.length >= 2) {
      setValue('name', watchedValues.facilityInfo.name, { shouldValidate: true, shouldDirty: true })
    }
  }, [watchedValues.facilityInfo?.name, setValue])

  // Restore email from localStorage if available
  useEffect(() => {
    if (initialState?.email && !watchedValues.email) {
      setValue('email', initialState.email)
      emailRef.current = initialState.email
    }
  }, []) // Only run once on mount

  // Save state to localStorage whenever relevant values change
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const email = watchedValues.email || emailRef.current
    if (email && currentStep >= 1) {
      const state: SignupState = {
        currentStep,
        email,
        timestamp: Date.now(),
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (error) {
        console.error('Error saving signup state to localStorage:', error)
      }
    }
  }, [currentStep, watchedValues.email])

  // Sync facilityInfo email when main email changes
  useEffect(() => {
    if (watchedValues.email) {
      setValue('facilityInfo.email', watchedValues.email)
    }
  }, [watchedValues.email, setValue])

  // Sync facilityInfo phone with main phone when it changes
  useEffect(() => {
    if (watchedValues.phone && watchedValues.phone !== '+255 ') {
      setValue('facilityInfo.phone', watchedValues.phone, { shouldValidate: true })
    }
  }, [watchedValues.phone, setValue])

  // Load regions on component mount
  useEffect(() => {
    loadRegions()
  }, [])
  
  // Retry loading regions if still empty after initial load
  useEffect(() => {
    if (regions.length === 0 && !isLoadingRegions && currentStep >= 3) {
      console.log('[Signup] No regions found, retrying...')
      const retryTimer = setTimeout(() => {
        loadRegions()
      }, 1000)
      return () => clearTimeout(retryTimer)
    }
  }, [currentStep, regions.length, isLoadingRegions])

  // Sync region/district state with form values when step 3 is shown
  useEffect(() => {
    if (currentStep === 3 && regions.length > 0) {
      const formRegionId = watchedValues.facilityInfo?.regionId
      const formDistrictId = watchedValues.facilityInfo?.districtId
      const formRegion = watchedValues.facilityInfo?.region
      
      // If form has a region ID, sync it with state
      if (formRegionId) {
        const regionIdStr = formRegionId.toString()
        if (selectedRegionId !== regionIdStr) {
          setSelectedRegionId(regionIdStr)
          // Load districts for this region
          loadDistricts(formRegionId)
        }
      } else if (formRegion && regions.length > 0) {
        // If form has region name but no ID, try to find matching region
        const matchingRegion = regions.find(r => r.name === formRegion)
        if (matchingRegion) {
          const regionIdStr = matchingRegion.id.toString()
          setSelectedRegionId(regionIdStr)
          setValue('facilityInfo.regionId', matchingRegion.id)
          loadDistricts(matchingRegion.id)
        }
      }
      
      // If form has a district ID and districts are loaded, sync it
      if (formDistrictId && districts.length > 0) {
        const districtIdStr = formDistrictId.toString()
        if (selectedDistrictId !== districtIdStr) {
          setSelectedDistrictId(districtIdStr)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, regions.length, watchedValues.facilityInfo?.regionId, watchedValues.facilityInfo?.districtId])

  // Debounce timer refs for duplicate checking
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for duplicate phone/email
  const checkDuplicates = async (phone?: string, email?: string) => {
    if (!phone && !email) return
    
    setIsCheckingDuplicates(true)
    try {
      const params = new URLSearchParams()
      if (phone) params.append('phone', phone.replace(/\s/g, ''))
      if (email) params.append('email', email.toLowerCase().trim())
      
      const response = await fetch(`/api/auth/check-duplicates?${params}`)
      const result = await response.json()
      
      if (response.ok) {
        setPhoneDuplicate(result.duplicates.phone)
        setEmailDuplicate(result.duplicates.email)
        setDuplicateDetails(result.duplicates)
        
        // Show toast notification if duplicates found
        if (result.duplicates.phone || result.duplicates.email) {
          const messages = []
          if (result.duplicates.phone && result.duplicates.phoneIn) {
            messages.push(`Phone already exists: ${result.duplicates.phoneIn.join(', ')}`)
          }
          if (result.duplicates.email && result.duplicates.emailIn) {
            messages.push(`Email already exists: ${result.duplicates.emailIn.join(', ')}`)
          }
          toast.error(messages.join(' | '))
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
    } finally {
      setIsCheckingDuplicates(false)
    }
  }

  const loadRegions = async () => {
    try {
      setIsLoadingRegions(true)
      console.log('[Signup] Loading regions from /api/regions...')
      const response = await fetch('/api/regions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
      
      console.log('[Signup] Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('[Signup] API response:', result)
        const regionsData = result.data || []
        console.log('[Signup] Regions data:', regionsData)
        setRegions(regionsData)
        console.log('[Signup] Regions state updated, count:', regionsData.length)
        if (regionsData.length === 0) {
          console.warn('[Signup] No regions found in database. Please run the seed script to populate regions.')
          toast.error('No regions available. Please contact support.')
        } else {
          console.log('[Signup] Successfully loaded', regionsData.length, 'regions')
        }
      } else {
        const errorText = await response.text()
        console.error('[Signup] Failed to load regions:', response.status, response.statusText, errorText)
        toast.error('Failed to load regions. Please refresh the page.')
      }
    } catch (error) {
      console.error('[Signup] Error loading regions:', error)
      toast.error('Error loading regions. Please check your connection and try again.')
    } finally {
      setIsLoadingRegions(false)
    }
  }

  const loadDistricts = async (regionId: number) => {
    try {
      setDistricts([]) // Clear previous districts
      const response = await fetch(`/api/districts?regionId=${regionId}`)
      if (response.ok) {
        const result = await response.json()
        const districtsData = result.data || []
        setDistricts(districtsData)
        console.log('Districts loaded for region', regionId, ':', districtsData.length)
      } else {
        console.error('Failed to load districts:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading districts:', error)
    }
  }

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId)
    setSelectedDistrictId('')
    setDistricts([])
    
    // Update form value with region name and ID
    const selectedRegion = regions.find(r => r.id.toString() === regionId)
    if (selectedRegion) {
      setValue('facilityInfo.region', selectedRegion.name)
      setValue('facilityInfo.regionId', parseInt(regionId))
    }
    
    // Clear district/city
    setValue('facilityInfo.city', '')
    setValue('facilityInfo.districtId', undefined)
    
    if (regionId) {
      loadDistricts(parseInt(regionId))
    }
  }

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId)
    
    // Update form value with district name (stored in city field) and ID
    const selectedDistrict = districts.find(d => d.id.toString() === districtId)
    if (selectedDistrict) {
      setValue('facilityInfo.city', selectedDistrict.name)
      setValue('facilityInfo.districtId', parseInt(districtId))
    }
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    
    // Address is optional - allow empty value
    if (!value || value.trim() === '') {
      setValue('facilityInfo.address', '', { shouldValidate: true })
      return
    }
    
    // If user starts typing, optionally add "P.O BOX " prefix if they don't have it
    const prefix = "P.O BOX "
    
    // If value doesn't start with prefix and user is typing, allow free-form input
    // Only auto-format if they're clearly trying to enter a PO BOX number
    if (!value.startsWith(prefix) && /^\d/.test(value.trim())) {
      // If they start with a number, assume they want PO BOX format
      const numbers = value.replace(/\D/g, '')
      if (numbers) {
        value = prefix + numbers
      }
    } else if (value.startsWith(prefix)) {
      // If it starts with prefix, extract only numbers from the part after the prefix
      const afterPrefix = value.substring(prefix.length)
      const numbers = afterPrefix.replace(/\D/g, '')
      value = prefix + numbers
    }
    
    setValue('facilityInfo.address', value, { shouldValidate: true })
  }

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const prefix = "P.O BOX "
    const input = e.currentTarget
    const cursorPosition = input.selectionStart || 0
    const currentAddress = watchedValues.facilityInfo?.address || prefix
    
    // Prevent deletion of the prefix
    if (cursorPosition <= prefix.length) {
      // Allow backspace/delete only if there's content after the prefix
      if ((e.key === 'Backspace' || e.key === 'Delete') && currentAddress.length > prefix.length) {
        // Allow the deletion but it will be handled by onChange
        return
      }
      // Prevent cursor from going before the prefix
      if (e.key === 'ArrowLeft' || e.key === 'Home') {
        e.preventDefault()
        input.setSelectionRange(prefix.length, prefix.length)
      }
    }
    
    // Prevent typing non-numeric characters after the prefix
    if (cursorPosition >= prefix.length) {
      if (e.key.length === 1 && !/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        e.preventDefault()
      }
    }
  }

  const handleAddressFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Address is optional - no auto-formatting on focus
    // User can type freely or leave empty
  }


  // Helper function to check if password meets requirements
  const isPasswordValid = (): boolean => {
    if (!password || password.length === 0) return false
    if (password !== confirmPassword) return false
    
    const validation = validatePassword(password, {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true,
      minStrength: 2,
    })
    
    return validation.isValid
  }

  const validateCurrentStep = async (): Promise<boolean> => {
    if (currentStep === 1) {
      // Check for duplicates before proceeding
      if (phoneDuplicate) {
        toast.error('Please use a different phone number. This number already exists.')
        return false
      }
      if (emailDuplicate) {
        toast.error('Please use a different email address. This email already exists.')
        return false
      }
      
      // Check for duplicates before proceeding
      if (phoneDuplicate) {
        toast.error('Please use a different phone number. This number already exists.')
        return false
      }
      if (emailDuplicate) {
        toast.error('Please use a different email address. This email already exists.')
        return false
      }
      
      return await trigger(['email', 'phone', 'password']) && password === confirmPassword && isPasswordValid()
    } else if (currentStep === 2) {
      return await trigger(['facilityInfo.name', 'facilityInfo.city', 'facilityInfo.region'])
    }
    return true
  }


  const handleNext = async () => {
    if (currentStep === 1) {
      // Check for duplicates before proceeding
      if (phoneDuplicate) {
        toast.error('Please use a different phone number. This number already exists.')
        return
      }
      if (emailDuplicate) {
        toast.error('Please use a different email address. This email already exists.')
        return
      }

      // Validate step 1 fields
      const isValid = await trigger(['email', 'phone', 'password'])
      if (!isValid) {
        toast.error('Please fill all required fields')
        return
      }

      // Validate password match
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }

      // Validate password strength
      if (password) {
        const validation = validatePassword(password, {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          minStrength: 2,
        })
        if (!validation.isValid) {
          toast.error(validation.errors[0] || 'Password too weak')
          return
        }
      }

      // All validations passed, proceed to facility info
      setCurrentStep(2)
      return
    }

    const isValid = await validateCurrentStep()
    if (!isValid) {
      toast.error('Please complete all required fields')
      return
    }

    if (currentStep < 3) {
      const nextStep = (currentStep + 1) as Step
      setCurrentStep(nextStep)
      
      // Update localStorage (the useEffect will also handle this, but we do it explicitly here)
      if (typeof window !== 'undefined') {
        try {
          const email = emailRef.current || watchedValues.email
          if (email) {
            const state: SignupState = {
              currentStep: nextStep,
              email,
              timestamp: Date.now(),
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
          }
        } catch (error) {
          console.error('Error saving signup state:', error)
        }
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as Step
      setCurrentStep(prevStep)
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        try {
          const email = emailRef.current || watchedValues.email
          if (email) {
            const state: SignupState = {
              currentStep: prevStep,
              email,
              timestamp: Date.now(),
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
          }
        } catch (error) {
          console.error('Error saving signup state:', error)
        }
      }
    }
  }

  const onSubmit = async (data: RegisterForm) => {
    // Reset editing field to ensure button is clickable
    setEditingField(null)
    
    // Final duplicate check before submission
    if (phoneDuplicate) {
      toast.error('Cannot create account. This phone number already exists in our system.')
      return
    }
    if (emailDuplicate) {
      toast.error('Cannot create account. This email address already exists in our system.')
      return
    }
    
    // Check if terms are accepted
    if (!acceptedTerms) {
      toast.error('You must accept the terms and conditions to create an account')
      return
    }
    
    // Ensure name field is set from facility name before validation
    if (!data.name || data.name.length < 2) {
      if (data.facilityInfo?.name && data.facilityInfo.name.length >= 2) {
        data.name = data.facilityInfo.name
      } else {
        toast.error('Facility name is required')
        return
      }
    }
    

    // Ensure name is set from facility name (required by schema)
    // Use password from form data (now properly registered)
    const finalData = {
      ...data,
      name: data.name || data.facilityInfo?.name || '',
      password: data.password, // Now use form data password
      acceptTerms: acceptedTerms, // Include terms acceptance
    }

    // Validate all required fields (password is now from form data)
    if (!finalData.phone || !finalData.password || !finalData.facilityInfo) {
      toast.error('Please complete all required fields')
      return
    }

    if (!finalData.name || finalData.name.length < 2) {
      toast.error('Facility name is required')
      return
    }

    // Note: address is now optional, so don't require it
    if (!finalData.facilityInfo.name || !finalData.facilityInfo.city || !finalData.facilityInfo.region) {
      toast.error('Please complete all required facility information fields')
      return
    }

    setIsLoading(true)
    try {
      // Set name to facility name (required by schema)
      const normalizedPhone = finalData.phone.replace(/\s/g, '')
      
      const payload = {
        phone: normalizedPhone,
        name: finalData.name, // Use facility name as user name
        password: finalData.password, // This now uses password from local state
        ...(finalData.email && { email: finalData.email }), // Only include email if provided
        facilityInfo: {
          name: finalData.facilityInfo.name,
          address: finalData.facilityInfo.address || '', // Address is optional
          city: finalData.facilityInfo.city,
          region: finalData.facilityInfo.region,
          phone: normalizedPhone, // Use main phone number for facility phone as well
          // Include optional fields if provided
          ...(finalData.facilityInfo.category && { category: finalData.facilityInfo.category }),
          ...(finalData.facilityInfo.regionId && { regionId: finalData.facilityInfo.regionId }),
          ...(finalData.facilityInfo.districtId && { districtId: finalData.facilityInfo.districtId }),
          ...(finalData.facilityInfo.latitude !== undefined && { latitude: finalData.facilityInfo.latitude }),
          ...(finalData.facilityInfo.longitude !== undefined && { longitude: finalData.facilityInfo.longitude }),
          // Include email in facilityInfo if provided
          ...(finalData.email && { email: finalData.email }),
        },
      }

      console.log('Sending registration request:', { ...payload, password: '***' })

      // The /api/users endpoint handles facility creation automatically
      console.log('Making API call to /api/users')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('API response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      const result = await response.json()
      console.log('Registration response body:', result)

      if (!response.ok) {
        const errorMessage = result.message || result.error || 'Failed to create account'
        console.error('Registration failed:', errorMessage)
        if (result.details && Array.isArray(result.details)) {
          const detailMessages = result.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
          toast.error(detailMessages || errorMessage)
        } else {
          toast.error(errorMessage)
        }
        setIsLoading(false)
        return
      }

      console.log('Registration successful!')
      // Clear localStorage on successful registration
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
      
      toast.success('Account created successfully! Please sign in to continue.')
      setTimeout(() => {
        router.push('/auth/signin')
      }, 1500)
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }


  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:grid-cols-2">
            {/* Contact information */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+255 712 345 678"
                    {...register("phone", {
                      required: 'Phone number is required',
                      validate: (value) => {
                        if (!value || value.length <= "+255 ".length) {
                          return 'Please enter a phone number'
                        }
                        const afterPrefix = value.substring("+255 ".length)
                        const digitsOnly = afterPrefix.replace(/\D/g, '')
                        if (digitsOnly.length !== 9) {
                          return 'Phone number must have exactly 9 digits after +255 (e.g., +255 712 345 678)'
                        }
                        return true
                      }
                    })}
                    onChange={(e) => {
                      let value = e.target.value
                      
                      // Ensure "+255 " prefix is always present
                      const prefix = "+255 "
                      
                      // If user tries to delete the prefix, prevent it
                      if (!value.startsWith(prefix)) {
                        // If value is shorter than prefix, restore prefix
                        if (value.length < prefix.length) {
                          value = prefix
                        } else {
                          // If user typed something else, extract only numbers and add prefix
                          const digitsOnly = value.replace(/\D/g, '')
                          // If starts with 0, remove it and use remaining digits
                          if (digitsOnly.startsWith('0') && digitsOnly.length > 1) {
                            const remainingDigits = digitsOnly.substring(1)
                            value = prefix + (remainingDigits.length <= 9 ? remainingDigits : remainingDigits.substring(0, 9))
                          } else if (digitsOnly.startsWith('255') && digitsOnly.length > 3) {
                            // If starts with 255, use digits after 255
                            const after255 = digitsOnly.substring(3)
                            value = prefix + (after255.length <= 9 ? after255 : after255.substring(0, 9))
                          } else {
                            // Use all digits, limit to 9
                            value = prefix + (digitsOnly.length <= 9 ? digitsOnly : digitsOnly.substring(0, 9))
                          }
                        }
                      } else {
                        // Extract only numbers from the part after the prefix
                        const afterPrefix = value.substring(prefix.length)
                        const digitsOnly = afterPrefix.replace(/\D/g, '')
                        // Limit to 9 digits
                        value = prefix + (digitsOnly.length <= 9 ? digitsOnly : digitsOnly.substring(0, 9))
                      }
                      
                      setValue('phone', value, { shouldValidate: true })
                      // Also sync to facilityInfo.phone
                      setValue('facilityInfo.phone', value, { shouldValidate: true })
                      
                      // Check duplicates if phone is complete (debounced)
                      const afterPrefix = value.substring(prefix.length)
                      const digitsOnly = afterPrefix.replace(/\D/g, '')
                      if (digitsOnly.length === 9) {
                        const normalizedPhone = value.replace(/\s/g, '')
                        // Clear previous timeout
                        if (phoneCheckTimeoutRef.current) {
                          clearTimeout(phoneCheckTimeoutRef.current)
                        }
                        // Debounce duplicate check
                        phoneCheckTimeoutRef.current = setTimeout(() => {
                          checkDuplicates(normalizedPhone, undefined)
                        }, 500)
                      } else {
                        // Clear duplicate status if phone is incomplete
                        setPhoneDuplicate(false)
                        if (phoneCheckTimeoutRef.current) {
                          clearTimeout(phoneCheckTimeoutRef.current)
                        }
                      }
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      const prefix = "+255 "
                      const input = e.currentTarget
                      const cursorPosition = input.selectionStart || 0
                      const currentPhone = watchedValues.phone || prefix
                      
                      // Prevent deletion of the prefix
                      if (cursorPosition <= prefix.length) {
                        // Allow backspace/delete only if there's content after the prefix
                        if ((e.key === 'Backspace' || e.key === 'Delete') && currentPhone.length > prefix.length) {
                          // Allow the deletion but it will be handled by onChange
                          return
                        }
                        // Prevent cursor from going before the prefix
                        if (e.key === 'ArrowLeft' || e.key === 'Home') {
                          e.preventDefault()
                          input.setSelectionRange(prefix.length, prefix.length)
                        }
                      }
                      
                      // Prevent typing non-numeric characters after the prefix
                      if (cursorPosition >= prefix.length) {
                        if (e.key.length === 1 && !/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault()
                        }
                      }
                    }}
                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                      const prefix = "+255 "
                      const currentPhone = watchedValues.phone || ''
                      // If phone is empty or doesn't start with prefix, set it
                      if (!currentPhone.startsWith(prefix)) {
                        setValue('phone', prefix, { shouldValidate: true })
                      }
                      // Move cursor to end after prefix
                      setTimeout(() => {
                        const phone = watchedValues.phone || prefix
                        e.target.setSelectionRange(phone.length, phone.length)
                      }, 0)
                    }}
                    disabled={isLoading}
                    className={`h-11 border pl-11 text-sm transition-all focus:bg-card ${phoneDuplicate ? 'border-destructive/50 bg-destructive/5 pr-11' : 'border-border bg-muted/40'}`}
                  />
                  {phoneDuplicate && (
                    <AlertCircle className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-destructive" aria-hidden />
                  )}
                </div>
                {errors.phone && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    {errors.phone.message}
                  </p>
                )}
                {phoneDuplicate && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    Phone number already exists. Please use a different number.
                  </p>
                )}
                {!errors.phone && !phoneDuplicate && (
                  <p className="text-xs text-muted-foreground">Enter the 9-digit number after +255.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                  <Input
                    id="email"
                    type="email"
                    placeholder="facility@example.com"
                    {...register("email", {
                      onChange: (e) => {
                        const email = e.target.value.trim()
                        if (email && email.includes('@') && email.includes('.')) {
                          // Clear previous timeout
                          if (emailCheckTimeoutRef.current) {
                            clearTimeout(emailCheckTimeoutRef.current)
                          }
                          // Debounce duplicate check for email
                          emailCheckTimeoutRef.current = setTimeout(() => {
                            checkDuplicates(undefined, email)
                          }, 500)
                        } else {
                          // Clear duplicate status if email is incomplete
                          setEmailDuplicate(false)
                          if (emailCheckTimeoutRef.current) {
                            clearTimeout(emailCheckTimeoutRef.current)
                          }
                        }
                      }
                    })}
                    disabled={isLoading}
                    className={`h-11 border pl-11 text-sm transition-all focus:bg-card ${emailDuplicate ? 'border-destructive/50 bg-destructive/5 pr-11' : 'border-border bg-muted/40'}`}
                  />
                  {emailDuplicate && (
                    <AlertCircle className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-destructive" aria-hidden />
                  )}
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    {errors.email.message}
                  </p>
                )}
                {!errors.email && !emailDuplicate && (
                  <p className="text-xs text-muted-foreground">This email will be used for your account.</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    {...register("password", {
                      onChange: (e) => setPassword(e.target.value)
                    })}
                    value={password}
                    disabled={isLoading}
                    className="h-11 border border-border bg-muted/40 pl-11 pr-11 text-sm transition-all focus:bg-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
                {password && <PasswordStrengthIndicator password={password} />}
                {passwordValidationErrors.length > 0 && (
                  <div className="space-y-1">
                    {passwordValidationErrors.map((error, index) => (
                      <p key={index} className="flex items-center gap-1.5 text-sm text-destructive">
                        <AlertCircle className="size-4 shrink-0" aria-hidden />
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 border border-border bg-muted/40 pl-11 pr-11 text-sm transition-all focus:bg-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Facility details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Facility details</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="facilityName" className="text-sm font-medium text-foreground">
                    Facility name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                    <Input
                      id="facilityName"
                      type="text"
                      placeholder="Health Center Name"
                      {...register("facilityInfo.name")}
                      disabled={isLoading}
                      className="h-11 border border-border bg-muted/40 pl-11 text-sm transition-all focus:bg-card"
                    />
                  </div>
                  {errors.facilityInfo?.name && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      {errors.facilityInfo.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium text-foreground">
                    Facility category
                  </Label>
                  <Select
                    value={watchedValues.facilityInfo?.category || 'Dispensary'}
                    onValueChange={(value: "Dispensary" | "Pharmacy" | "DMDL" | "Laboratory" | "Polyclinic" | "Specialized Polyclinic" | "Health Center" | "Hospital" | "District Hospital" | "Regional Hospital") =>
                      setValue('facilityInfo.category', value, { shouldValidate: true })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 border border-border bg-muted/40 text-sm">
                      <SelectValue placeholder="Select facility category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dispensary">Dispensary</SelectItem>
                      <SelectItem value="Health Center">Health Center</SelectItem>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                      <SelectItem value="District Hospital">District Hospital</SelectItem>
                      <SelectItem value="Regional Hospital">Regional Hospital</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="Laboratory">Laboratory</SelectItem>
                      <SelectItem value="Polyclinic">Polyclinic</SelectItem>
                      <SelectItem value="Specialized Polyclinic">Specialized Polyclinic</SelectItem>
                      <SelectItem value="DMDL">DMDL</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.facilityInfo?.category && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      {errors.facilityInfo.category.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Location</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address" className="text-sm font-medium text-foreground">
                    P.O BOX address
                  </Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                    <Input
                      id="address"
                      type="text"
                      placeholder="P.O BOX 1234"
                      {...register("facilityInfo.address")}
                      onChange={(e) => {
                        handleAddressChange(e)
                      }}
                      onKeyDown={handleAddressKeyDown}
                      onFocus={handleAddressFocus}
                      disabled={isLoading}
                      className="h-11 border border-border bg-muted/40 pl-11 text-sm transition-all focus:bg-card"
                    />
                  </div>
                  {errors.facilityInfo?.address && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      {errors.facilityInfo.address.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm font-medium text-foreground">
                    Region <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedRegionId}
                    onValueChange={handleRegionChange}
                    disabled={isLoading || isLoadingRegions}
                  >
                    <SelectTrigger className="h-11 border border-border bg-muted/40 text-sm">
                      <SelectValue placeholder={isLoadingRegions ? "Loading regions..." : "Select region"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingRegions ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden />
                        </div>
                      ) : regions.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No regions available
                        </div>
                      ) : (
                        regions.map((region) => (
                          <SelectItem key={region.id} value={region.id.toString()}>
                            {region.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.facilityInfo?.region && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      {errors.facilityInfo.region.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district" className="text-sm font-medium text-foreground">
                    District
                  </Label>
                  <Select
                    value={selectedDistrictId}
                    onValueChange={handleDistrictChange}
                    disabled={isLoading || !selectedRegionId}
                  >
                    <SelectTrigger className="h-11 border border-border bg-muted/40 text-sm">
                      <SelectValue placeholder={!selectedRegionId ? "Select region first" : districts.length === 0 ? "No districts available" : "Select district"} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          {!selectedRegionId ? "Please select a region first" : "No districts available"}
                        </div>
                      ) : (
                        districts.map((district) => (
                          <SelectItem key={district.id} value={district.id.toString()}>
                            {district.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.facilityInfo?.districtId && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      {errors.facilityInfo.districtId.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* GPS location */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">GPS location</h3>
                <Badge variant="secondary" className="text-xs">
                  Recommended
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Provide GPS coordinates to enable map display and location services. Click &quot;Use Current Location&quot; for automatic detection.
              </p>
              <LocationPicker
                onLocationChange={(lat, lng) => {
                  setValue('facilityInfo.latitude', lat)
                  setValue('facilityInfo.longitude', lng)
                  console.log('[Signup] GPS coordinates captured:', { latitude: lat, longitude: lng })
                }}
                initialLatitude={watchedValues.facilityInfo?.latitude}
                initialLongitude={watchedValues.facilityInfo?.longitude}
                disabled={isLoading}
              />
            </div>
          </div>
        )

      case 3:
        const renderEditableField = (label: string, value: string, fieldKey: string, isEmail = false) => {
          const isEditing = editingField === fieldKey
          return (
            <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-3">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}:</span>
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type={isEmail ? "email" : "text"}
                    value={value}
                    onChange={(e) => {
                      if (fieldKey.includes('.')) {
                        const [parent, child] = fieldKey.split('.')
                        setValue(`${parent}.${child}` as any, e.target.value)
                      } else {
                        setValue(fieldKey as any, e.target.value)
                      }
                    }}
                    className="h-8 text-xs flex-1"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setEditingField(null)}
                    className="h-8 px-2"
                    aria-label={`Save ${label}`}
                  >
                    <CheckCircle2 className="w-3 h-3" aria-hidden />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-end gap-2">
                  <span className="text-foreground font-semibold text-xs sm:text-sm text-right break-words flex-1">
                    {value || 'N/A'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingField(fieldKey)}
                    className="text-primary hover:text-primary/80 transition-colors"
                    aria-label={`Edit ${label}`}
                  >
                    <Edit2 className="w-3 h-3" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )
        }

        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <h3 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-4" aria-hidden />
                  </span>
                  Account information
                </h3>
                <div className="space-y-2">
                  {renderEditableField("Email", watchedValues.email || '', 'email', true)}
                  {renderEditableField("Phone", watchedValues.phone || '', 'phone', true)}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <h3 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                  Facility information
                </h3>
                <div className="space-y-2">
                  {renderEditableField("Name", watchedValues.facilityInfo?.name || '', 'facilityInfo.name')}
                  {renderEditableField("Address", watchedValues.facilityInfo?.address || '', 'facilityInfo.address')}
                  {renderEditableField("City", watchedValues.facilityInfo?.city || '', 'facilityInfo.city')}
                  {renderEditableField("Region", watchedValues.facilityInfo?.region || '', 'facilityInfo.region')}
                </div>
              </div>
            </div>

            {/* Terms and conditions */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="terms" className="cursor-pointer text-sm font-medium text-foreground hover:text-foreground/90">
                      I agree to the Terms and Conditions
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      By creating an account, you agree to our{' '}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      . You must accept these terms to complete your registration.
                    </p>
                  </div>
                </div>
                {!acceptedTerms && (
                  <p className="ml-7 flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="size-3 shrink-0" aria-hidden />
                    You must accept the terms and conditions to create an account
                  </p>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const currentStepData = steps.find(s => s.number === currentStep)

  return (
    <LazyMotionProvider>
      <SolarBackground index={bgIndex} animated={!reduce} />

      <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-2">
        {/* Brand panel (desktop) — over the photo */}
        <AuthBrandPanel
          headline="Register your facility for climate-resilient solar power."
          bgIndex={bgIndex}
          onSelectBg={setBgIndex}
        />

        {/* Wizard panel */}
        <main className="flex min-h-screen items-center justify-center p-6">
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="w-full max-w-2xl">
            {/* Mobile brand header (brand panel hidden < lg) */}
            <AuthMobileBrand />

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-card/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
              <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-solar" />
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6">
                  <Link
                    href="/auth/signin"
                    className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                    Back to sign in
                  </Link>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Create your account</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Step {currentStep} of {steps.length} · {currentStepData?.title}
                      </p>
                    </div>
                    <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                      Join 500+ facilities
                    </Badge>
                  </div>
                </div>

                {/* Stepper */}
                <div className="mb-7">
                  <div className="flex items-center">
                    {steps.map((step, index) => {
                      const StepIcon = step.icon
                      const isActive = step.number === currentStep
                      const isCompleted = step.number < currentStep
                      const isLast = index === steps.length - 1
                      return (
                        <div key={step.number} className={cn("flex items-center", !isLast && "flex-1")}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                                isActive
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                                  : isCompleted
                                    ? "border-primary/60 bg-primary/80 text-primary-foreground"
                                    : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="size-4" aria-hidden />
                              ) : (
                                <StepIcon className="size-4" aria-hidden />
                              )}
                            </div>
                            <div className="hidden sm:block">
                              <p
                                className={cn(
                                  "text-xs font-semibold",
                                  isActive || isCompleted ? "text-foreground" : "text-muted-foreground",
                                )}
                              >
                                {step.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{step.description}</p>
                            </div>
                          </div>
                          {!isLast && <div className="mx-2 h-px flex-1 bg-border sm:mx-3" />}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                      style={{ width: `${(currentStep / steps.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit(async (data) => {
                    await onSubmit(data)
                  }, (errors) => {
                    console.error('Form validation failed:', errors)
                  })}
                  className="space-y-6"
                >
                  {renderStepContent()}

                  {/* Navigation */}
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
                    <div>
                      {currentStep > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          disabled={isLoading}
                          className="group h-11 px-5 text-sm font-semibold"
                        >
                          <ChevronLeft className="mr-1.5 size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                          Previous
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentStep < 3 ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          disabled={isLoading}
                          className="group h-11 px-6 text-sm font-semibold"
                        >
                          Next
                          <ChevronRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={
                            isLoading ||
                            !acceptedTerms ||
                            phoneDuplicate ||
                            emailDuplicate
                          }
                          className="group h-11 px-6 text-sm font-semibold"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                              Creating account…
                            </>
                          ) : (
                            <>
                              Create account
                              <CheckCircle2 className="ml-1.5 size-4" aria-hidden />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Footer */}
                <div className="mt-6 space-y-3 border-t border-border pt-5 text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/auth/signin" className="font-semibold text-primary underline-offset-2 hover:underline">
                      Sign in
                    </Link>
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Link href="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
                      Terms
                    </Link>
                    <span aria-hidden>•</span>
                    <Link href="/privacy-policy" className="font-medium text-primary underline-offset-2 hover:underline">
                      Privacy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        </main>
      </div>
    </LazyMotionProvider>
  )
}
                              
                                                                                                                                                                                      
