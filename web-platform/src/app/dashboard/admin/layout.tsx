import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { isManagementPanelUser } from "@/lib/auth/management-panel"


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard/facility")
  }

  if (isManagementPanelUser(session.user.email)) {
    redirect("/dashboard/management-panel")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
