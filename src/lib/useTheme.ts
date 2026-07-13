import { useEffect, useState } from "react";

/** Thème clair/sombre persistant (localStorage `bennespro-theme`). */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("bennespro-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    window.localStorage.setItem("bennespro-theme", theme);
  }, [theme]);

  return [theme, setTheme] as const;
}

/** Force le thème clair tant que le composant est monté (portail public). */
export function useForceLightTheme() {
  useEffect(() => {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }, []);
}
