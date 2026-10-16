// One server-sent events connection to the back end (/sw-api/stream), shared by everything that
// wants live updates: the menu badge, the toast for new urgent alerts and the Alerts page.
import { useEffect, useSyncExternalStore } from "react";
import { AlertCounts, SW_BASE, swFetcher } from "./api";

export type FeedEvent =
  | { type: "alert"; alert_id: number; action: string }
  | { type: "camera_status"; camera: string; status: string }
  | { type: "event"; event_id: number; frigate_event_id: string };

type Listener = (event: FeedEvent) => void;

const listeners = new Set<Listener>();
let source: EventSource | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let connected = false;
const connectedListeners = new Set<() => void>();

function setConnected(value: boolean) {
  if (connected !== value) {
    connected = value;
    connectedListeners.forEach((fn) => fn());
  }
}

function dispatch(raw: MessageEvent) {
  let parsed: FeedEvent | null = null;
  try {
    parsed = JSON.parse(raw.data) as FeedEvent;
  } catch {
    return;
  }
  if (parsed) {
    listeners.forEach((fn) => fn(parsed as FeedEvent));
  }
}

function open() {
  if (source || listeners.size === 0) {
    return;
  }
  const es = new EventSource(`${SW_BASE}stream`);
  source = es;
  es.onopen = () => {
    setConnected(true);
    // Anything that happened while we were away: recount.
    void refreshCounts();
  };
  es.addEventListener("alert", dispatch);
  es.addEventListener("camera_status", dispatch);
  es.addEventListener("event", dispatch);
  es.onerror = () => {
    setConnected(false);
    // The browser retries on its own for network errors, but gives up on HTTP errors (for
    // example when the Frigate session ends). Reopen after a pause either way.
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      source = null;
      if (!retry) {
        retry = setTimeout(() => {
          retry = null;
          open();
        }, 5000);
      }
    }
  };
}

function close() {
  if (retry) {
    clearTimeout(retry);
    retry = null;
  }
  source?.close();
  source = null;
  setConnected(false);
}

/** Adds a listener; the connection opens with the first one and closes with the last. */
export function subscribeFeed(listener: Listener): () => void {
  listeners.add(listener);
  open();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      close();
    }
  };
}

export function useFeed(listener: Listener | null) {
  useEffect(() => {
    if (!listener) {
      return;
    }
    return subscribeFeed(listener);
  }, [listener]);
}

export function useFeedConnected() {
  return useSyncExternalStore(
    (fn) => {
      connectedListeners.add(fn);
      return () => connectedListeners.delete(fn);
    },
    () => connected,
  );
}

// ---- open alert counts (menu badge)

let counts: AlertCounts = { open: 0, open_urgent: 0 };
const countListeners = new Set<() => void>();
let refreshing: Promise<void> | null = null;

export function refreshCounts(): Promise<void> {
  if (!refreshing) {
    refreshing = swFetcher<AlertCounts>("alerts/counts")
      .then((c) => {
        counts = c;
        countListeners.forEach((fn) => fn());
      })
      .catch(() => {})
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export function useAlertCounts(): AlertCounts {
  return useSyncExternalStore(
    (fn) => {
      countListeners.add(fn);
      return () => countListeners.delete(fn);
    },
    () => counts,
  );
}
