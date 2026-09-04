import { createFileRoute } from "@tanstack/react-router";
import { AdminProvidersPane } from "@/components/admin-providers";

export const Route = createFileRoute("/admin/providers")({ component: AdminProviders });

function AdminProviders() {
  return <AdminProvidersPane />;
}
