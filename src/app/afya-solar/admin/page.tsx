import { redirect } from "next/navigation"

// The standalone Afya Solar admin console has been consolidated into the single
// admin panel at /dashboard/admin (which mirrors the facility manager dashboard).
export default function AfyaSolarAdminPage() {
  redirect("/dashboard/admin")
}
