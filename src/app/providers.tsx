"use client";

import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/hooks/use-commands";
import { ThemeProvider } from "@/components/theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
    >
      {children}
      <Toaster />
      <CommandPalette />
    </ThemeProvider>
  );
}
