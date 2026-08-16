"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "carpool-hub-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // re-ask after a week

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-chrome/20 bg-panel px-4 py-3 shadow-lg sm:left-auto sm:right-4"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-warmwhite">Install Carpool Hub</p>
            <p className="text-xs text-chrome/70">Add to your home screen for quick access</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-chrome/60 hover:text-chrome"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="rounded-md bg-signal-amber px-3 py-1.5 text-xs font-semibold text-asphalt"
          >
            Install
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
