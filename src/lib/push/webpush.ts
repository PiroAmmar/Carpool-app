import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

let configured = false;

// Lazy-configure so builds without the env vars set (e.g. before Stage 1
// migration is live) don't crash at import time — only when actually sending.
export function getWebPush() {
  if (!configured) {
    if (!publicKey || !privateKey) {
      throw new Error('VAPID keys not set — NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
    }
    webpush.setVapidDetails('mailto:ammarcarpool@gmail.com', publicKey, privateKey);
    configured = true;
  }
  return webpush;
}
