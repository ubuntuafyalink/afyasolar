/**
 * Environment variable validation
 * Validates all required environment variables lazily (only when accessed)
 * This allows the build process to complete without requiring env vars
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  
  // During build time, return defaults instead of throwing errors
  // This allows Next.js build to complete without requiring env vars
  // Runtime validation will happen when the app actually runs
  if (!value) {
    // Check if we're in build phase (Next.js sets this during build)
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
                        process.env.NEXT_PHASE === 'phase-development-build' ||
                        (typeof process.env.VERCEL === 'undefined' && !process.env.VERCEL_ENV)
    
    if (isBuildPhase) {
      return defaultValue || ''
    }
    
    throw new Error(`Missing required environment variable: ${key}`)
  }
  
  return value
}

function getEnvVarOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                     process.env.NEXT_PHASE === 'phase-development-build'

export const env = {
  // Database
  get DB_HOST() { return getEnvVar('DB_HOST') },
  get DB_PORT() { return parseInt(getEnvVar('DB_PORT', '4000')) },
  get DB_USER() { return getEnvVar('DB_USER') },
  get DB_PASSWORD() { return getEnvVar('DB_PASSWORD') },
  get DB_NAME() { return getEnvVar('DB_NAME', 'afya_solar') },
  get DB_SSL() { return getEnvVarOptional('DB_SSL', 'true') === 'true' },
  get DB_CA_PATH() { return getEnvVarOptional('DB_CA_PATH') },
  
  // NextAuth
  get NEXTAUTH_SECRET() { return getEnvVar('NEXTAUTH_SECRET') },
  get NEXTAUTH_URL() { 
    // Priority: 1. Explicit NEXTAUTH_URL, 2. Vercel production (use custom domain), 3. Localhost for dev
    if (process.env.NEXTAUTH_URL) {
      return process.env.NEXTAUTH_URL
    }
    // If running on Vercel (production), use the custom domain
    if (process.env.VERCEL || process.env.VERCEL_ENV === 'production') {
      return 'https://afyasolar.ubuntuafyalink.co.tz'
    }
    // Use localhost for local development
    return 'http://localhost:3000'
  },
  
  // Node Environment
  get NODE_ENV() { return getEnvVarOptional('NODE_ENV', 'development') as 'development' | 'production' | 'test' },
  
  // Optional: Email service (for future email verification)
  get SMTP_HOST() { return getEnvVarOptional('SMTP_HOST') },
  get SMTP_PORT() { return getEnvVarOptional('SMTP_PORT') },
  get SMTP_USER() { return getEnvVarOptional('SMTP_USER') },
  get SMTP_PASSWORD() { return getEnvVarOptional('SMTP_PASSWORD') },
  
  // Optional: Rate limiting
  get RATE_LIMIT_ENABLED() { return getEnvVarOptional('RATE_LIMIT_ENABLED', 'true') === 'true' },
  
  // Cloudinary
  get CLOUDINARY_CLOUD_NAME() { return getEnvVar('CLOUDINARY_CLOUD_NAME') },
  get CLOUDINARY_API_KEY() { return getEnvVar('CLOUDINARY_API_KEY') },
  get CLOUDINARY_API_SECRET() { return getEnvVar('CLOUDINARY_API_SECRET') },

  // AI (optional)
  get GOOGLE_AI_API_KEY() { return getEnvVarOptional('GOOGLE_AI_API_KEY') },
  get GOOGLE_AI_MODEL_NAME() { return getEnvVarOptional('GOOGLE_AI_MODEL_NAME', 'gemini-1.5-flash') },
  get GOOGLE_AI_SYSTEM_PROMPT() { return getEnvVarOptional('GOOGLE_AI_SYSTEM_PROMPT') },
  get GEMINI_API_KEY() { return getEnvVarOptional('GEMINI_API_KEY') ?? getEnvVarOptional('GOOGLE_AI_API_KEY') },
  get GEMINI_MODEL() { return getEnvVarOptional('GEMINI_MODEL', 'gemini-2.0-flash') },
  get OPENAI_API_KEY() { return getEnvVarOptional('OPENAI_API_KEY') },
  get OPENAI_MODEL() { return getEnvVarOptional('OPENAI_MODEL', 'gpt-4o-mini') },
  get GROQ_API_KEY() { return getEnvVarOptional('GROQ_API_KEY') },
  get GROQ_MODEL() { return getEnvVarOptional('GROQ_MODEL', 'llama-3.1-8b-instant') },

  // Application base URL
  get APP_BASE_URL() { return getEnvVarOptional('APP_BASE_URL', 'http://localhost:3000') },

  // AI service (FastAPI) base URL - server-only; the browser calls it via /api/ai/forecast
  get AI_SERVICE_URL() { return getEnvVarOptional('AI_SERVICE_URL', 'http://localhost:8000') },

  // Payments (Azam Pay)
  get AZAM_PAY_ENVIRONMENT() { return getEnvVarOptional('AZAM_PAY_ENVIRONMENT', 'sandbox') },
  get AZAM_PAY_APP_NAME() { return getEnvVarOptional('AZAM_PAY_APP_NAME') },
  get AZAM_PAY_CLIENT_ID() { return getEnvVarOptional('AZAM_PAY_CLIENT_ID') },
  get AZAM_PAY_CLIENT_SECRET() { return getEnvVarOptional('AZAM_PAY_CLIENT_SECRET') },
  get AZAM_PAY_API_KEY() { return getEnvVarOptional('AZAM_PAY_API_KEY') },

  // Storage (optional)
  get BLOB_READ_WRITE_TOKEN() { return getEnvVarOptional('BLOB_READ_WRITE_TOKEN') },

  // Cron / scheduled-job shared secret
  get CRON_SECRET() { return getEnvVarOptional('CRON_SECRET') },

  // Messaging: provider selection + SmartSMS config
  get SMS_PROVIDER() { return getEnvVarOptional('SMS_PROVIDER', 'smartsms') },
  get SMARTSMS_API_KEY() { return getEnvVarOptional('SMARTSMS_API_KEY') },
  get SMARTSMS_API_URL() { return getEnvVarOptional('SMARTSMS_API_URL', 'https://smartsms.ipab.co.tz/api/v3/sms/send') },
  get SMARTSMS_SENDER_ID() { return getEnvVarOptional('SMARTSMS_SENDER_ID') },

  // Messaging: Africa's Talking (optional, primary SMS/USSD/Voice once configured)
  get AFRICASTALKING_USERNAME() { return getEnvVarOptional('AFRICASTALKING_USERNAME') },
  get AFRICASTALKING_API_KEY() { return getEnvVarOptional('AFRICASTALKING_API_KEY') },
  get AFRICASTALKING_SENDER_ID() { return getEnvVarOptional('AFRICASTALKING_SENDER_ID') },

  // Web Push (VAPID)
  get NEXT_PUBLIC_VAPID_PUBLIC_KEY() { return getEnvVarOptional('NEXT_PUBLIC_VAPID_PUBLIC_KEY') },
  get VAPID_PRIVATE_KEY() { return getEnvVarOptional('VAPID_PRIVATE_KEY') },
  get VAPID_SUBJECT() { return getEnvVarOptional('VAPID_SUBJECT', 'mailto:admin@example.com') },

  // Device telemetry ingestion token (inverter adapters / gateways)
  get DEVICE_INGEST_TOKEN() { return getEnvVarOptional('DEVICE_INGEST_TOKEN') },
} as const

