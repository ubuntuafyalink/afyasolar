'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Gauge,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/management-panel', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/management-panel/sites', label: 'Installation Sites', icon: Building2 },
  { href: '/dashboard/management-panel/packages', label: 'Package Management', icon: Package },
  { href: '/dashboard/management-panel/energy-efficiency', label: 'Energy Efficiency', icon: Gauge },
  { href: '/dashboard/management-panel/payment-history', label: 'Payment History', icon: Receipt },
]

export function ManagementPanelSidebar() {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-lg bg-card border border-border shadow-sm hover:bg-muted active:scale-95 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-muted-foreground" aria-hidden />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col shadow-sm',
          'transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full min-h-screen overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <Link
              href="/dashboard/management-panel"
              className="flex items-center gap-2.5 min-w-0 rounded-lg hover:bg-muted active:bg-muted transition-colors p-1 -m-1"
            >
              <div className="relative w-9 h-9 rounded-lg bg-muted border border-border flex-shrink-0 overflow-hidden ring-1 ring-border">
                <Image
                  src="/images/services/logo.png"
                  alt="Ubuntu Afyalink"
                  fill
                  className="object-contain p-1"
                  sizes="36px"
                />
              </div>
              <span className="font-semibold text-foreground truncate text-sm">Management Panel</span>
            </Link>
            <button
              type="button"
              onClick={() => (window.innerWidth >= 1024 ? setSidebarOpen(!sidebarOpen) : setMobileOpen(false))}
              className="p-1.5 rounded-lg hover:bg-muted lg:block hidden"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <X className="w-4 h-4" aria-hidden /> : <Menu className="w-4 h-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted lg:hidden"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard/management-panel' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-4',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.99]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon aria-hidden className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight aria-hidden className={cn('w-4 h-4 opacity-70 shrink-0', isActive && 'text-primary-foreground')} />
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
