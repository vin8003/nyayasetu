import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ScrollMemory } from "@/components/scroll-memory";
import { ClientToaster } from "@/components/client-toaster";
import appCss from "../styles.css?url";

const APP_NAME = "CiteBench";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "CiteBench — the lawyer's practice assistant. Court diary, matters, orders and Indian case-law research.",
      },
      { name: "theme-color", content: "#0c1014" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <ScrollMemory />
        <AuthProvider>
          <Outlet />
          <ClientToaster />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
