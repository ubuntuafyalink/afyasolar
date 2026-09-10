import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ManagementPanelSidebar } from '@/components/management-panel/management-panel-sidebar'
import { isManagementPanelUser } from '@/lib/auth/management-panel'


export default async function ManagementPanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (!isManagementPanelUser(session.user?.email)) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <ManagementPanelSidebar />
      <main className="min-h-screen overflow-auto scroll-smooth [scrollbar-gutter:stable] lg:ml-64 transition-[margin] duration-200">
        <div className="p-4 lg:p-6 pt-16 lg:pt-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
