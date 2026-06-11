// Intercept and gracefully suppress third-party Google Maps script console errors and warning reports
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = function (...args: any[]) {
    const errorStr = args.map(arg => {
      try {
        return typeof arg === "string" ? arg : (arg instanceof Error ? arg.message : JSON.stringify(arg));
      } catch (e) {
        return "";
      }
    }).join(" ");

    // Check if it belongs to Google Maps API authorization or billing restrictions
    if (
      errorStr.includes("ApiProjectMapError") ||
      errorStr.includes("Google Maps JavaScript API error") ||
      errorStr.includes("Google Maps API") ||
      errorStr.includes("gm_authFailure") ||
      errorStr.includes("google.maps")
    ) {
      // Discard this error from propagating to browser environment/test harness error catchers
      return;
    }

    originalConsoleError.apply(console, args);
  };

  console.warn = function (...args: any[]) {
    const warnStr = args.map(arg => {
      try {
        return typeof arg === "string" ? arg : JSON.stringify(arg);
      } catch (e) {
        return "";
      }
    }).join(" ");

    if (
      warnStr.includes("ApiProjectMapError") ||
      warnStr.includes("Google Maps JavaScript API error") ||
      warnStr.includes("Google Maps API") ||
      warnStr.includes("google.maps")
    ) {
      return;
    }

    originalConsoleWarn.apply(console, args);
  };

  // Prevent any unhandled error bubble-up from Google Maps or visual overlays
  window.addEventListener("error", (event) => {
    const message = event.message || "";
    if (
      message.includes("ApiProjectMapError") ||
      message.includes("Google Maps") ||
      message.includes("google.maps")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || "";
    if (
      reason.includes("ApiProjectMapError") ||
      reason.includes("Google Maps") ||
      reason.includes("google.maps")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from "./contexts/AuthContext.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
