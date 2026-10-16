// Client for the Horus back end. Same origin as Frigate (Caddy forwards /sw-api), so Frigate's
// login cookie goes along with every request and the back end asks Frigate who we are.
import axios, { AxiosError } from "axios";
import useSWR, { SWRConfiguration } from "swr";
import { baseUrl } from "@/api/baseUrl";
import {
  isRedirectingToLogin,
  setRedirectingToLogin,
} from "@/api/auth-redirect";

export const SW_BASE = `${baseUrl}sw-api/`;

export const sw = axios.create({
  baseURL: SW_BASE,
  headers: { "X-CSRF-TOKEN": 1 },
});

// A 401 means the Frigate session ended: go to Frigate's login page, as Frigate's own calls do.
sw.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !isRedirectingToLogin()) {
      setRedirectingToLogin(true);
      window.location.href = `${baseUrl}login`;
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export const swFetcher = <T>(path: string) =>
  sw.get<T>(path).then((res) => res.data);

/** SWR over the back end. Keys are prefixed so they never collide with Frigate's own cache. */
export function useSw<T>(path: string | null, options?: SWRConfiguration<T>) {
  return useSWR<T>(
    path ? ["sw", path] : null,
    ([, p]: [string, string]) => swFetcher<T>(p),
    options,
  );
}

// ---- types mirrored from backend/src/api/*.rs

export type Level = "normal" | "urgent";
export type RuleLevel = "off" | "logged" | "normal" | "urgent";
export type FaceStatus = "known" | "unknown" | "not_visible";

export type Note = {
  id: number;
  user_name: string;
  text: string;
  created_at: string;
};

export type Alert = {
  id: number;
  event_id: number | null;
  frigate_event_id: string | null;
  rule_key: string;
  camera: string;
  camera_display: string;
  level: Level;
  title: string;
  description: string;
  description_source: "vlm" | "fallback";
  snapshot_url: string | null;
  review_id: string | null;
  has_clip: boolean;
  status: "open" | "handled";
  handled_by: string | null;
  handled_at: string | null;
  escalation_step: number;
  created_at: string;
  face_status: FaceStatus | null;
  face_name: string | null;
  note_count: number;
  notes?: Note[];
};

export type AlertCounts = { open: number; open_urgent: number };

export type Zone = {
  id: number;
  camera: string;
  frigate_name: string;
  kind: string;
  display_name: string;
};

export type Rule = {
  id?: number;
  key: string;
  camera: string | null;
  zone: string | null;
  enabled: boolean;
  level_working_hours: RuleLevel;
  level_after_hours: RuleLevel;
};

export const RULE_KEYS = [
  "known_entered_left",
  "unknown_entered",
  "restricted_zone",
  "vehicle_at_gate",
  "loitering",
  "camera_offline",
] as const;

export const RULE_LEVELS: RuleLevel[] = ["off", "logged", "normal", "urgent"];

export type Day = {
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
};

export type Holiday = { id: number; date: string; name: string };

export type Recipient = {
  id: number;
  name: string;
  telegram_chat_id: number;
  min_level: Level;
  escalation_order: number;
  active: boolean;
};

export type Snooze = {
  id: number;
  camera: string | null;
  rule_key: string | null;
  until: string | null;
  created_by: string;
  created_at: string;
};

export type PersonDay = {
  name: string;
  first_seen: number;
  last_seen: number;
  entries: number;
  exits: number;
};

export type Movement = {
  event_id: number;
  frigate_event_id: string;
  review_id: string | null;
  camera: string;
  label: string;
  name: string | null;
  face_status: FaceStatus;
  direction: "entered" | "left";
  time: number;
};

export type DailySummary = {
  date: string;
  people: PersonDay[];
  unknown_entered: number;
  movements: Movement[];
  alerts: { urgent: number; normal: number; open: number };
  cameras: {
    name: string;
    display_name: string;
    status: string;
    uptime_pct: number;
  }[];
};

/** Where Frigate shows the recording for an event: its review item, else the object in Explore. */
export function frigateEventUrl(
  reviewId: string | null,
  frigateEventId: string | null,
): string | null {
  if (reviewId) {
    return `/review?id=${encodeURIComponent(reviewId)}`;
  }
  if (frigateEventId) {
    return `/explore?event_id=${encodeURIComponent(frigateEventId)}`;
  }
  return null;
}

/** RFC 3339 text from the back end -> epoch seconds (what Frigate's date hooks take). */
export function toSeconds(rfc3339: string): number {
  return Date.parse(rfc3339) / 1000;
}
