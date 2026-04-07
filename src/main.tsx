import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme before render to prevent flash
const theme = localStorage.getItem("theme") || "system";
const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
if (isDark) document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
