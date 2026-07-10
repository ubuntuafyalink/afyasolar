"use client"

import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Upload,
  Building2,
  Phone,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  X,
  UserPlus,
  Download,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react"
import { useFacilities } from "@/hooks/use-facilities"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"

interface CSVRow {
  phoneNumber: string
  facilityName: string
}

interface ManualRecipient {
  id: string
  phoneNumber: string
  facilityName: string
}

// GSM-7 basic + extended character set (anything outside ⇒ message is sent as UCS-2/Unicode).
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM7_EXT = "^{}\\[~]|€"

function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7.includes(ch) && !GSM7_EXT.includes(ch)) return false
  }
  return true
}

/** Length in SMS units: GSM-7 extended chars count as 2; non-GSM ⇒ UCS-2 (1 each). */
function smsLength(text: string, gsm: boolean): number {
  if (!gsm) return [...text].length // UCS-2 code points
  let n = 0
  for (const ch of text) n += GSM7_EXT.includes(ch) ? 2 : 1
  return n
}

/** Segment math: GSM 160/153, Unicode 70/67 per segment. */
function smsSegments(text: string): { segments: number; unicode: boolean; chars: number } {
  const gsm = isGsm7(text)
  const len = smsLength(text, gsm)
  const single = gsm ? 160 : 70
  const multi = gsm ? 153 : 67
  const segments = len === 0 ? 0 : len <= single ? 1 : Math.ceil(len / multi)
  return { segments, unicode: !gsm, chars: len }
}

// MUST mirror the wrapper in src/app/api/admin/bulk-sms/route.ts.
function composeSms(facilityName: string, body: string): string {
  return `Dear Manager ${facilityName},\n\n${body}\n\n- Ubuntu Afya Link Team`
}

export function AdminBulkSMS() {
  const { data: facilities, isLoading: facilitiesLoading } = useFacilities()
  const [selectedMethod, setSelectedMethod] = useState<'facilities' | 'csv' | 'manual'>('facilities')
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set())
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([])
  const [newRecipient, setNewRecipient] = useState({ phoneNumber: '', facilityName: '' })
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResults, setSendResults] = useState<{
    success: number
    failed: number
    details: Array<{ phone: string; facilityName: string; success: boolean; error?: string }>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [copiedFailed, setCopiedFailed] = useState(false)

  const hasPhone = (f: { phone?: string | null }) => Boolean(f.phone && f.phone.trim())

  // Filter facilities based on search
  const filteredFacilities = facilities?.filter(facility => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      facility.name.toLowerCase().includes(query) ||
      facility.phone.toLowerCase().includes(query) ||
      facility.city.toLowerCase().includes(query) ||
      facility.region.toLowerCase().includes(query)
    )
  }) || []
  // Only facilities with a phone can actually receive an SMS.
  const selectableFacilities = filteredFacilities.filter(hasPhone)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          toast.error('CSV file must have at least a header row and one data row')
          return
        }

        // Helper function to parse CSV line (handles quoted values)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          result.push(current.trim())
          return result
        }

        // Parse header
        const header = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
        const phoneIndex = header.findIndex(h => 
          h.includes('phone') || h.includes('mobile') || h.includes('number')
        )
        const facilityIndex = header.findIndex(h => 
          h.includes('facility') || h.includes('name')
        )

        if (phoneIndex === -1 || facilityIndex === -1) {
          toast.error('CSV must have columns: phone number and facility name')
          return
        }

        // Parse data rows
        const parsedData: CSVRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim())
          const phoneNumber = values[phoneIndex]?.replace(/[^0-9+]/g, '') || ''
          const facilityName = values[facilityIndex] || ''

          if (phoneNumber && facilityName) {
            // Normalize phone number (ensure it starts with country code)
            let normalizedPhone = phoneNumber
            if (!normalizedPhone.startsWith('+')) {
              if (normalizedPhone.startsWith('0')) {
                normalizedPhone = '+255' + normalizedPhone.substring(1)
              } else if (!normalizedPhone.startsWith('255')) {
                normalizedPhone = '+255' + normalizedPhone
              } else {
                normalizedPhone = '+' + normalizedPhone
              }
            }

            parsedData.push({
              phoneNumber: normalizedPhone,
              facilityName: facilityName
            })
          }
        }

        if (parsedData.length === 0) {
          toast.error('No valid data found in CSV file')
          return
        }

        setCsvData(parsedData)
        const skipped = Math.max(0, lines.length - 1 - parsedData.length)
        toast.success(
          `Loaded ${parsedData.length} phone number${parsedData.length !== 1 ? 's' : ''} from CSV${skipped > 0 ? ` (${skipped} row${skipped !== 1 ? 's' : ''} skipped)` : ''}`,
        )
      } catch (error) {
        console.error('Error parsing CSV:', error)
        toast.error('Failed to parse CSV file. Please check the format.')
      }
    }

    reader.readAsText(file)
  }

  const toggleFacility = (facilityId: string) => {
    setSelectedFacilities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(facilityId)) {
        newSet.delete(facilityId)
      } else {
        newSet.add(facilityId)
      }
      return newSet
    })
  }

  const toggleAllFacilities = () => {
    // Only select facilities that have a phone number.
    if (selectableFacilities.every(f => selectedFacilities.has(f.id)) && selectableFacilities.length > 0) {
      setSelectedFacilities(new Set())
    } else {
      setSelectedFacilities(new Set(selectableFacilities.map(f => f.id)))
    }
  }

  const downloadCsvTemplate = () => {
    const csv = "phone number,facility name\n+255712345678,Example Clinic\n0754000111,Another Facility\n"
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bulk-sms-template.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleAddManualRecipient = () => {
    if (!newRecipient.phoneNumber.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^(\+?255|0)[0-9]{9}$/
    if (!phoneRegex.test(newRecipient.phoneNumber.replace(/\s+/g, ''))) {
      toast.error('Please enter a valid Tanzanian phone number (e.g., 0712345678 or +255712345678)')
      return
    }

    // Normalize phone number
    let normalizedPhone = newRecipient.phoneNumber.trim()
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+255' + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith('+255') && !normalizedPhone.startsWith('255')) {
      normalizedPhone = '+255' + normalizedPhone
    } else if (normalizedPhone.startsWith('255')) {
      normalizedPhone = '+' + normalizedPhone
    }

    setManualRecipients(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        phoneNumber: normalizedPhone,
        facilityName: newRecipient.facilityName.trim()
      }
    ])
    
    // Reset form
    setNewRecipient({ phoneNumber: '', facilityName: '' })
  }

  const removeManualRecipient = (id: string) => {
    setManualRecipients(prev => prev.filter(r => r.id !== id))
  }

  const handleSendSMS = async () => {
    setShowConfirm(false)
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    let recipients: Array<{ facilityId?: string; phoneNumber?: string; facilityName: string }> = []

    if (selectedMethod === 'facilities') {
      if (selectedFacilities.size === 0) {
        toast.error('Please select at least one facility')
        return
      }

      const selectedFacilitiesData = facilities?.filter(f => selectedFacilities.has(f.id)) || []
      // Send facilityId so API uses phone from database, not from API response
      recipients = selectedFacilitiesData.map(f => ({
        facilityId: f.id,
        facilityName: f.name
      }))
    } else if (selectedMethod === 'csv') {
      if (csvData.length === 0) {
        toast.error('Please upload a CSV file with phone numbers')
        return
      }
      recipients = csvData
    } else {
      if (manualRecipients.length === 0) {
        toast.error('Please add at least one recipient')
        return
      }
      recipients = manualRecipients.map(({ phoneNumber, facilityName }) => ({
        phoneNumber,
        facilityName
      }))
    }

    setIsSending(true)
    setSendResults(null)

    try {
      const response = await fetch('/api/admin/bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          message: message.trim()
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send bulk SMS')
      }

      setSendResults(result.data)
      toast.success(`SMS sent: ${result.data.success} successful, ${result.data.failed} failed`)
      
      // Clear selections after successful send
      if (selectedMethod === 'facilities') {
        setSelectedFacilities(new Set())
      } else {
        setCsvData([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
      setMessage('')
    } catch (error) {
      console.error('Error sending bulk SMS:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send bulk SMS')
    } finally {
      setIsSending(false)
    }
  }

  const selectedCount = selectedMethod === 'facilities'
    ? selectedFacilities.size
    : selectedMethod === 'csv'
      ? csvData.length
      : manualRecipients.length

  const requestSend = () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    if (selectedCount === 0) {
      toast.error('Please add at least one recipient')
      return
    }
    setShowConfirm(true)
  }

  // Recipient names for the live preview + segment estimate.
  const recipientNames = useMemo(() => {
    if (selectedMethod === 'facilities') {
      return (facilities ?? []).filter(f => selectedFacilities.has(f.id)).map(f => f.name)
    }
    if (selectedMethod === 'csv') return csvData.map(r => r.facilityName)
    return manualRecipients.map(r => r.facilityName || 'Manager')
  }, [selectedMethod, facilities, selectedFacilities, csvData, manualRecipients])

  const sampleName = recipientNames[0] || 'Royal Polyclinic'
  const longestName = recipientNames.reduce((a, b) => (b.length > a.length ? b : a), sampleName)
  const previewText = composeSms(sampleName, message.trim() || 'Your message will appear here…')
  const seg = useMemo(() => smsSegments(composeSms(longestName, message.trim())), [longestName, message])
  const totalUnits = seg.segments * selectedCount

  const failedNumbers = sendResults?.details.filter(d => !d.success).map(d => d.phone) ?? []
  const copyFailed = () => {
    void navigator.clipboard?.writeText(failedNumbers.join('\n'))
    setCopiedFailed(true)
    setTimeout(() => setCopiedFailed(false), 1500)
  }
  // Show failures first in the results list.
  const orderedDetails = sendResults
    ? [...sendResults.details].sort((a, b) => Number(a.success) - Number(b.success))
    : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk SMS</CardTitle>
          <CardDescription className="text-xs">
            Send SMS messages to multiple facilities or phone numbers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method Selection */}
          <div role="radiogroup" aria-label="Recipient source" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              type="button"
              role="radio"
              aria-checked={selectedMethod === 'facilities'}
              onClick={() => {
                setSelectedMethod('facilities')
                setCsvData([])
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              className={cn(
                "p-4 border-2 rounded-lg transition-all text-left h-full",
                selectedMethod === 'facilities'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className={cn(
                  "w-5 h-5",
                  selectedMethod === 'facilities' ? "text-primary" : "text-muted-foreground"
                )} aria-hidden="true" />
                <span className="font-medium text-sm">Select from Facilities</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose from registered facilities
              </p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedMethod === 'csv'}
              onClick={() => {
                setSelectedMethod('csv')
                setSelectedFacilities(new Set())
              }}
              className={cn(
                "p-4 border-2 rounded-lg transition-all text-left h-full",
                selectedMethod === 'csv'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Upload className={cn(
                  "w-5 h-5",
                  selectedMethod === 'csv' ? "text-primary" : "text-muted-foreground"
                )} aria-hidden="true" />
                <span className="font-medium text-sm">Upload CSV File</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload phone numbers via CSV
              </p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedMethod === 'manual'}
              onClick={() => {
                setSelectedMethod('manual')
                setSelectedFacilities(new Set())
                setCsvData([])
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              className={cn(
                "p-4 border-2 rounded-lg transition-all text-left h-full",
                selectedMethod === 'manual'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className={cn(
                  "w-5 h-5",
                  selectedMethod === 'manual' ? "text-primary" : "text-muted-foreground"
                )} aria-hidden="true" />
                <span className="font-medium text-sm">Enter Manually</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Type phone numbers directly
              </p>
            </button>
          </div>

          {/* Facilities Selection */}
          {selectedMethod === 'facilities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search facilities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllFacilities}
                    disabled={selectableFacilities.length === 0}
                    className="text-xs h-8"
                  >
                    {selectableFacilities.length > 0 && selectableFacilities.every(f => selectedFacilities.has(f.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {selectedFacilities.size} selected
                  </Badge>
                </div>
              </div>

              {facilitiesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">Loading facilities...</p>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <EmptyState
                  icon={<Building2 aria-hidden="true" />}
                  title="No facilities found"
                />
              ) : (
                <div className="border border-border rounded-lg max-h-96 overflow-y-auto">
                  <div className="divide-y divide-border">
                    {filteredFacilities.map((facility) => (
                      <label
                        key={facility.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedFacilities.has(facility.id)}
                          onCheckedChange={() => toggleFacility(facility.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {facility.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" aria-hidden="true" />
                              {facility.phone}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {facility.city}, {facility.region}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry */}
          {selectedMethod === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label htmlFor="manual-phone" className="text-sm font-medium">Phone Number</label>
                    <Input
                      id="manual-phone"
                      type="tel"
                      placeholder="e.g. 0712345678 or +255712345678"
                      value={newRecipient.phoneNumber}
                      onChange={(e) => setNewRecipient(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="mt-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddManualRecipient()}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label htmlFor="manual-name" className="text-sm font-medium">Facility Name (Optional)</label>
                    <Input
                      id="manual-name"
                      type="text"
                      placeholder="Optional: Facility name"
                      value={newRecipient.facilityName}
                      onChange={(e) => setNewRecipient(prev => ({ ...prev, facilityName: e.target.value }))}
                      className="mt-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddManualRecipient()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddManualRecipient}
                      className="w-full md:w-auto"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Recipient
                    </Button>
                  </div>
                </div>
              </div>

              {manualRecipients.length > 0 && (
                <div className="border border-border rounded-lg">
                  <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {manualRecipients.length} recipient(s) added
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManualRecipients([])}
                      className="text-xs h-7"
                    >
                      <X className="w-3 h-3 mr-1" aria-hidden="true" />
                      Clear All
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {manualRecipients.map((recipient) => (
                      <div key={recipient.id} className="p-3 text-sm flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{recipient.facilityName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" aria-hidden="true" />
                            {recipient.phoneNumber}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeManualRecipient(recipient.id)}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CSV Upload */}
          {selectedMethod === 'csv' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload CSV File
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  CSV should have columns: phone number, facility name
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <div className="flex items-center justify-center gap-2">
                  <label htmlFor="csv-upload">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      asChild
                    >
                      <span>Choose File</span>
                    </Button>
                  </label>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={downloadCsvTemplate}>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download template
                  </Button>
                </div>
              </div>

              {csvData.length > 0 && (
                <div className="border border-border rounded-lg">
                  <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {csvData.length} phone number(s) loaded
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCsvData([])
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="text-xs h-7"
                    >
                      <X className="w-3 h-3 mr-1" aria-hidden="true" />
                      Clear
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {csvData.map((row, index) => (
                      <div key={index} className="p-3 text-sm">
                        <p className="font-medium text-foreground">{row.facilityName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" aria-hidden="true" />
                          {row.phoneNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message here... The facility name will be automatically included in each SMS."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] text-sm"
              maxLength={1000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Each SMS will include the facility name</span>
              <span>{message.length}/1000</span>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={requestSend}
            disabled={isSending || selectedCount === 0 || !message.trim()}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Sending SMS...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                Send SMS to {selectedCount} recipient{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>

          {/* Results */}
          {sendResults && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Send Results</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-primary">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span className="text-xs">{sendResults.success} successful</span>
                  </div>
                  {sendResults.failed > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      <span className="text-xs">{sendResults.failed} failed</span>
                    </div>
                  )}
                </div>
              </div>
              {orderedDetails.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {orderedDetails.map((detail, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-2 rounded-lg text-xs flex items-center justify-between",
                        detail.success ? "bg-success/10" : "bg-destructive/10"
                      )}
                    >
                      <div>
                        <p className="font-medium">{detail.facilityName}</p>
                        <p className="text-muted-foreground">{detail.phone}</p>
                      </div>
                      {detail.success ? (
                        <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-destructive" aria-hidden="true" />
                          {detail.error && (
                            <span className="text-destructive text-[10px]">{detail.error}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm before sending real SMS */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS to {selectedCount} recipient{selectedCount !== 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription>
              This sends a real SMS to each recipient — about <strong>{totalUnits} SMS unit{totalUnits !== 1 ? 's' : ''}</strong>
              {' '}({seg.segments} segment{seg.segments !== 1 ? 's' : ''} each{seg.unicode ? ', Unicode' : ''}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-background px-3 py-2 text-xs text-foreground shadow-sm">
              {previewText}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSendSMS} disabled={isSending}>
              {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4 mr-2" aria-hidden="true" />}
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

