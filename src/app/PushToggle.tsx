"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "denied" | "unsubscribed" | "subscribed" | "checking";

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let mounted = true;

    async function checkSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (mounted) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (mounted) setStatus("denied");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (mounted) {
          setStatus(sub ? "subscribed" : "unsubscribed");
        }
      } catch (err) {
        console.error("[push] Failed to get subscription:", err);
      }
    }

    checkSubscription();

    return () => {
      mounted = false;
    };
  }, []);

  async function subscribe() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });

    setStatus("subscribed");
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      setStatus("unsubscribed");
      return;
    }

    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });

    setStatus("unsubscribed");
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs text-chrome/60">
        Notifications aren&apos;t supported on this browser.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-chrome/60">
        Notifications blocked — enable them in your browser settings to get trip alerts.
      </p>
    );
  }

  return (
    <button
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      className={
        status === "subscribed"
          ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500 hover:bg-emerald-500/15"
          : "rounded-md border border-signal-amber/40 bg-signal-amber/10 px-3 py-1.5 text-xs font-medium text-signal-amber hover:bg-signal-amber/15"
      }
    >
      {status === "subscribed" ? "Disable trip notifications" : "Enable trip notifications"}
    </button>
  );
}
