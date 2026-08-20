"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "carpool-hub-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // re-ask after a week

function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  // iOS Chrome/Firefox/etc. also use WebKit and report "Safari" in UA —
  // narrow to actual Safari by excluding other iOS browser tokens.
  const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && !isOtherIOSBrowser;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    // Safari (iOS and macOS) never fires beforeinstallprompt — there's no
    // programmatic install API on WebKit. Show manual instructions instead.
    if (isIOSSafari()) {
      queueMicrotask(() => {
        setShowIOSInstructions(true);
        setVisible(true);
      });
      return;
    }

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
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 left-4 right-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-chrome/20 bg-panel px-4 py-3 shadow-lg sm:left-auto sm:right-4"
        >
          {showIOSInstructions ? (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium text-warmwhite">Install Carpool Hub</p>
                <p className="text-xs text-chrome/70">
                  Tap <span className="font-semibold text-chrome">Share</span> in Safari, then{" "}
                  <span className="font-semibold text-chrome">Add to Home Screen</span>
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-xs text-chrome/60 hover:text-warmwhite hover:bg-chrome/10 rounded-md transition-colors active:scale-95"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium text-warmwhite">Install Carpool Hub</p>
                <p className="text-xs text-chrome/70">Add to your home screen for quick access</p>
              </div>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-xs text-chrome/60 hover:text-warmwhite hover:bg-chrome/10 rounded-md transition-colors active:scale-95"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="rounded-md bg-signal-amber px-3.5 py-1.5 text-xs font-semibold text-asphalt transition-transform active:scale-95 hover:brightness-105"
              >
                Install
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
