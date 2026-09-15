import "server-only";
import { env } from "@/config/env";
import { log } from "@/server/log";

export interface MeetingRequest {
  title: string;
  startsAt: Date;
  endsAt: Date;
  hostEmail?: string | null;
  description?: string | null;
}

export interface Meeting {
  provider: "ZOOM" | "GOOGLE_MEET" | "MICROSOFT_TEAMS" | "MANUAL";
  meetingId: string | null;
  joinUrl: string | null;
  passcode: string | null;
}

export interface LiveClassProvider {
  readonly name: Meeting["provider"];
  createMeeting(req: MeetingRequest): Promise<Meeting>;
  cancelMeeting(meetingId: string): Promise<void>;
}

/** Manual: instructors paste their own link (any platform). */
class ManualProvider implements LiveClassProvider {
  readonly name = "MANUAL" as const;
  async createMeeting(): Promise<Meeting> {
    return { provider: "MANUAL", meetingId: null, joinUrl: null, passcode: null };
  }
  async cancelMeeting() {
    /* nothing to cancel */
  }
}

/** Zoom Server-to-Server OAuth. */
class ZoomProvider implements LiveClassProvider {
  readonly name = "ZOOM" as const;
  private token: { value: string; expiresAt: number } | null = null;

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const e = env();
    const basic = Buffer.from(`${e.ZOOM_CLIENT_ID}:${e.ZOOM_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${e.ZOOM_ACCOUNT_ID}`, { method: "POST", headers: { Authorization: `Basic ${basic}` } });
    if (!res.ok) throw new Error(`Zoom auth failed: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }

  async createMeeting(req: MeetingRequest): Promise<Meeting> {
    const token = await this.accessToken();
    const user = req.hostEmail ?? "me";
    const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(user)}/meetings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: req.title,
        type: 2,
        start_time: req.startsAt.toISOString(),
        duration: Math.max(15, Math.round((req.endsAt.getTime() - req.startsAt.getTime()) / 60000)),
        agenda: req.description ?? undefined,
        settings: { join_before_host: false, waiting_room: true, auto_recording: "cloud", mute_upon_entry: true },
      }),
    });
    if (!res.ok) throw new Error(`Zoom create failed: ${res.status} ${await res.text()}`);
    const m = (await res.json()) as { id: number; join_url: string; password?: string };
    return { provider: "ZOOM", meetingId: String(m.id), joinUrl: m.join_url, passcode: m.password ?? null };
  }

  async cancelMeeting(meetingId: string) {
    const token = await this.accessToken();
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  }
}

/**
 * Google Meet and Teams require OAuth-delegated calendar access; the interface
 * is in place and the drivers degrade to manual links until credentials exist.
 */
class GoogleMeetProvider extends ManualProvider {
  override readonly name = "GOOGLE_MEET" as never;
}
class TeamsProvider extends ManualProvider {
  override readonly name = "MICROSOFT_TEAMS" as never;
}

let provider: LiveClassProvider | undefined;
export function liveClassProvider(): LiveClassProvider {
  if (provider) return provider;
  const e = env();
  switch (e.LIVE_CLASS_DRIVER) {
    case "zoom":
      if (e.ZOOM_ACCOUNT_ID && e.ZOOM_CLIENT_ID && e.ZOOM_CLIENT_SECRET) provider = new ZoomProvider();
      else {
        log.warn("LIVE_CLASS_DRIVER=zoom but credentials are missing; using manual links");
        provider = new ManualProvider();
      }
      break;
    case "google_meet":
      provider = new GoogleMeetProvider();
      break;
    case "teams":
      provider = new TeamsProvider();
      break;
    default:
      provider = new ManualProvider();
  }
  return provider;
}
