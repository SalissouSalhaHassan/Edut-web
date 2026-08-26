"use client";

import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem("edut_theme");
      if (saved === "light") {
        document.documentElement.classList.remove("dark");
        setThemeState("light");
      } else {
        document.documentElement.classList.add("dark");
        setThemeState("dark");
      }
    } catch {
      // Fallback to checking DOM class
      if (document.documentElement.classList.contains("dark")) {
        setThemeState("dark");
      } else {
        setThemeState("light");
      }
    }
  }, []);

  const setTheme = useCallback((newTheme: "dark" | "light") => {
    setThemeState(newTheme);
    try {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        localStorage.setItem("edut_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("edut_theme", "light");
      }
    } catch (e) {
      console.warn("Theme storage error:", e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
  }, [setTheme]);

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme,
    isMounted,
  };
}
