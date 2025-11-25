"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const { theme, setTheme } = useTheme();

  const hotKeysOptions = {
    preventDefault: true,
    enableOnFormTags: true,
    enableOnContentEditable: true,
  };

  useHotkeys(
    "ctrl+shift+l",
    () => {
      if (theme === "light") {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    },
    hotKeysOptions
  );

  return null;
}
