import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ScrollMemory } from "@/components/scroll-memory";
import { ClientToaster } from "@/components/client-toaster";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
      { name: "theme-color", content: "#f5f3ee", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0b0e13", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
