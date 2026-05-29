import { ManagementPanelSitesContent } from '@/components/management-panel/management-panel-sites'

export default function ManagementPanelSitesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Installation Sites</h1>
      <p className="text-muted-foreground mb-6">All sites where the system has been installed and is operational.</p>
      <ManagementPanelSitesContent />
    </div>
  )
}
