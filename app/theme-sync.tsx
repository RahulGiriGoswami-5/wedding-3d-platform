"use client";

import { useEffect } from "react";

export const THEME_KEY = "wedding-planner-theme";
export type PlannerTheme = "light" | "dark";

export function applyPlannerTheme(theme: PlannerTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("dark-mode", theme === "dark");
  root.classList.toggle("page-dark", theme === "dark");
}

export default function ThemeSync() {
  useEffect(() => {
    const syncFromStorage = () => {
      const theme: PlannerTheme =
        window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
      applyPlannerTheme(theme);
    };

    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<PlannerTheme>).detail;
      applyPlannerTheme(detail === "dark" ? "dark" : "light");
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) syncFromStorage();
    };

    syncFromStorage();
    window.addEventListener("wedding-planner-theme-change", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wedding-planner-theme-change", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
