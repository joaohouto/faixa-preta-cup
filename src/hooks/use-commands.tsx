"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const { theme, setTheme } = useTheme();

  useHotkeys(
    "ctrl+shift+l",
    () => {
      if (theme === "light") {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    }
  );

  return null;
}
