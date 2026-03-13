"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const { theme, setTheme } = useTheme();

  useHotkeys(
    "ctrl+shift+l",
    () => setTheme(theme === "light" ? "dark" : "light"),
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    }
  );

  return null;
}
