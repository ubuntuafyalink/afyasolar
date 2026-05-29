'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { User, Mail, Bell, Shield } from 'lucide-react'
interface ManagementPanelSettingsProps {
  user?: { name?: string | null; email?: string | null } | null
}

export function ManagementPanelSettings({ user }: ManagementPanelSettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Account and panel preferences</p>
      </div>
      <Card className="rounded-lg border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" aria-hidden />
            Profile
          </CardTitle>
          <CardDescription>Your management panel account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={user?.name ?? 'Management Panel'} readOnly className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? 'services@ubuntuafyalink.co.tz'} readOnly className="mt-1 bg-muted" />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" aria-hidden />
            Notifications
          </CardTitle>
          <CardDescription>How you receive alerts and reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Email notifications are sent to your registered address for payment confirmations, system alerts, and monthly summaries.</p>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" aria-hidden />
            Access
          </CardTitle>
          <CardDescription>Management panel access is restricted to authorized stakeholders.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You have view-only access to installation sites, payment history, notifications, and reports. For password changes, contact your system administrator.</p>
        </CardContent>
      </Card>
    </div>
  )
}
