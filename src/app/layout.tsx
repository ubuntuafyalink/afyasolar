import type React from "react"
import type { Metadata, Viewport } from "next"
import { PT_Serif } from "next/font/google"
import { Atkinson_Hyperlegible } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { SessionGuard } from "@/components/auth/session-guard"
import { PushNotificationPrompt } from "@/components/push-notification-prompt"
import "../styles/globals.css"

// PT Serif is the app-wide body/heading face (via --font-sans → the @theme stack
// in globals.css). Numerals fall through to a restricted-range JetBrains Mono
// face declared there, so amounts render mono while prose stays serif.
const ptSerif = PT_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-pt-serif",
  display: "swap",
})

// Atkinson Hyperlegible a dyslexia-friendly, high-legibility face exposed via
// the accessibility menu (the `a11y-dyslexia-friendly` class swaps --font-sans).
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Afya Solar | Healthcare facility solar dashboards",
  description: "Afya Solar: solar energy systems, monitoring, and facility energy dashboards for healthcare facilities in Tanzania.",
  generator: "Afya Solar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Afya Solar",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Afya Solar",
  },
  icons: {
    icon: [
      { url: "/images/services/logo.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [
      { url: "/images/services/logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/images/services/logo.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${ptSerif.variable} ${atkinson.variable} min-h-dvh overflow-x-hidden antialiased touch-manipulation`}
        suppressHydrationWarning
      >
        <Providers>
          <SessionGuard>
            {children}
          </SessionGuard>
          <InstallPrompt />
          <PushNotificationPrompt />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}

