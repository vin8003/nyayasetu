import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginForm } from "@/components/admin-login-form";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginForm,
});
