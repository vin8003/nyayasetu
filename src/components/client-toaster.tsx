import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Toaster
      theme="dark"
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#1c232c",
          color: "#e8e4db",
          border: "1px solid #2a313a",
        },
      }}
    />
  );
}
