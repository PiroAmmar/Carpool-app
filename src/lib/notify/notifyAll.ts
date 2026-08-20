import { createAdminClient } from '@/lib/supabase/admin';
import { getWebPush } from '@/lib/push/webpush';
import { sendEmail } from '@/lib/email/mailer';

interface NotifyUserParams {
  userId: string;
  userEmail: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  emailSubject: string;
  emailHtml: string;
}

interface SubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendPushPayload(
  subs: SubscriptionKeys[],
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const webpush = getWebPush();
  const serialized = JSON.stringify(payload);
  return Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        serialized
      )
    )
  );
}

/**
 * Single-recipient version — push if they have a live subscription,
 * personalized email otherwise. Used for approval/rejection where the
 * message is specific to one person (unlike notifyAll's BCC broadcast).
 */
export async function notifyUser(params: NotifyUserParams) {
  const { userId, userEmail, title, body, url = '/dashboard', tag, emailSubject, emailHtml } = params;
  const supabase = createAdminClient();

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (subs?.length) {
    try {
      const results = await sendPushPayload(subs, { title, body, url, tag });
      const succeeded = results.some((r) => r.status === 'fulfilled');
      const staleIds = subs.filter((_, i) => results[i].status === 'rejected').map((s) => s.id);
      if (staleIds.length) {
        await supabase.from('push_subscriptions').delete().in('id', staleIds);
      }

      if (succeeded) return { pushed: true, emailed: false };
    } catch {
      // VAPID not configured — fall through to email.
    }
  }

  const { error } = await sendEmail({ to: userEmail, subject: emailSubject, html: emailHtml });
  return { pushed: false, emailed: !error };
}

interface NotifyAllParams {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  emailSubject: string;
  emailHtml: string;
  /** Restrict to specific user ids (e.g. only the one passenger for an approval). Omit to notify every passenger. */
  userIds?: string[];
}

/**
 * Push-if-subscribed, email-fallback fan-out. One row in push_subscriptions
 * that fails (expired/unregistered) drops that row and falls through to
 * email for that user on the *next* call — not retried same-call, keeps
 * this fast for a 10-15 person group.
 */
export async function notifyAll(params: NotifyAllParams) {
  const { title, body, url = '/dashboard', tag, emailSubject, emailHtml, userIds } = params;
  const supabase = createAdminClient();

  let userQuery = supabase.from('users').select('id, email').eq('role', 'passenger');
  if (userIds?.length) userQuery = userQuery.in('id', userIds);
  const { data: users, error: usersError } = await userQuery;

  if (usersError || !users?.length) {
    return { pushed: 0, emailed: 0, error: usersError?.message };
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', users.map((u) => u.id));

  const subscribedUserIds = new Set((subs ?? []).map((s) => s.user_id));
  const emailFallback = users.filter((u) => !subscribedUserIds.has(u.id));

  let pushed = 0;
  const staleSubIds: string[] = [];

  if (subs?.length) {
    let results;
    try {
      results = await sendPushPayload(subs, { title, body, url, tag });
    } catch {
      // VAPID keys not configured — everyone falls back to email this call.
      emailFallback.push(...users.filter((u) => subscribedUserIds.has(u.id)));
    }

    if (results) {
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          pushed++;
        } else {
          // 404/410 = subscription gone (browser data cleared, uninstalled, etc).
          staleSubIds.push(subs[i].id);
          const user = users.find((u) => u.id === subs[i].user_id);
          if (user) emailFallback.push(user);
        }
      });

      if (staleSubIds.length) {
        await supabase.from('push_subscriptions').delete().in('id', staleSubIds);
      }
    }
  }

  let emailed = 0;
  if (emailFallback.length) {
    const bcc = [...new Set(emailFallback.map((u) => u.email).filter(Boolean))];
    if (bcc.length) {
      const { error } = await sendEmail({ bcc, subject: emailSubject, html: emailHtml });
      if (!error) emailed = bcc.length;
    }
  }

  return { pushed, emailed };
}
