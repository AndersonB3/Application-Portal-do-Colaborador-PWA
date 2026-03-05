"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA] Service Worker registrado:", reg.scope))
        .catch((err) => console.warn("[PWA] Falha ao registrar SW:", err));
    }
  }, []);

  return null;
}
