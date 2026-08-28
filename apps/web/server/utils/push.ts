import { importPKCS8, SignJWT } from "jose";
import type { AppointmentLiveEvent } from "~/types/live-events";
import { prisma } from "~/server/utils/prisma";
import { liveEventNotificationCopy, pushRecipientUserIds } from "~/utils/appointment-live-audience";

type CachedAccess = { token: string; expiresAt: number };

const globalForFcm = globalThis as typeof globalThis & {
  avelomFcmAccess?: CachedAccess;
};

function firebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

async function firebaseAccessToken(): Promise<string | null> {
  const config = firebaseConfig();
  if (!config) return null;
  const cached = globalForFcm.avelomFcmAccess;
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }
  try {
    const key = await importPKCS8(config.privateKey, "RS256");
    const assertion = await new SignJWT({
      iss: config.clientEmail,
      sub: config.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setAudience("https://oauth2.googleapis.com/token")
      .sign(key);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!payload.access_token) return null;
    globalForFcm.avelomFcmAccess = {
      token: payload.access_token,
      expiresAt: Date.now() + Math.max(60, Number(payload.expires_in) || 3600) * 1000,
    };
    return payload.access_token;
  } catch {
    return null;
  }
}

async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<"ok" | "gone" | "error"> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: {
              priority: "HIGH",
              notification: {
                channelId: "avelom_appointments",
                notificationCount: 1,
              },
            },
          },
        }),
      },
    );
    if (response.ok) return "ok";
    const text = await response.text();
    if (response.status === 404 || /UNREGISTERED|NOT_FOUND/i.test(text)) return "gone";
    return "error";
  } catch {
    return "error";
  }
}

export async function sendAppointmentPush(event: AppointmentLiveEvent): Promise<void> {
  const config = firebaseConfig();
  if (!config) return;
  const userIds = pushRecipientUserIds(event);
  if (!userIds.length) return;
  const rows = await prisma.devicePushToken.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, token: true },
  });
  if (!rows.length) return;
  const accessToken = await firebaseAccessToken();
  if (!accessToken) return;
  const copy = liveEventNotificationCopy(event);
  const data = {
    type: event.type,
    appointmentId: event.appointmentId,
    tenantId: event.tenantId,
  };
  const stale: string[] = [];
  await Promise.all(
    rows.map(async (row) => {
      const result = await sendFcmMessage(
        accessToken,
        config.projectId,
        row.token,
        copy.title,
        copy.body,
        data,
      );
      if (result === "gone") stale.push(row.id);
    }),
  );
  if (stale.length) {
    await prisma.devicePushToken.deleteMany({ where: { id: { in: stale } } });
  }
}
