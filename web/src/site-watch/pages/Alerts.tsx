import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  LuCheck,
  LuExternalLink,
  LuMessageSquare,
  LuUserPlus,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";
import { SW_NS } from "../i18n";
import {
  Alert,
  SW_BASE,
  errorMessage,
  frigateEventUrl,
  sw,
  swFetcher,
  toSeconds,
  useSw,
} from "../api";
import { FeedEvent, refreshCounts, useFeed, useFeedConnected } from "../feed";
import Shell, { Empty, LoadError } from "../components/Shell";
import { LevelBadge, TimeText } from "../components/bits";
import { SW_TOASTER } from "../nav";

type StatusFilter = "open" | "handled" | "all";
type LevelFilter = "all" | "urgent" | "normal";

export default function AlertsPage() {
  const { t } = useTranslation([SW_NS]);
  const [params, setParams] = useSearchParams();
  const focusId = params.get("id");
  const [status, setStatus] = useState<StatusFilter>(focusId ? "all" : "open");
  const [level, setLevel] = useState<LevelFilter>("all");

  const query = useMemo(() => {
    const q = new URLSearchParams({ limit: "200" });
    if (status !== "all") q.set("status", status);
    if (level !== "all") q.set("level", level);
    return `alerts?${q.toString()}`;
  }, [status, level]);

  const { data, error, mutate, isLoading } = useSw<Alert[]>(query);
  const connected = useFeedConnected();

  const onFeed = useCallback(
    (event: FeedEvent) => {
      if (event.type === "alert") {
        void mutate();
      }
    },
    [mutate],
  );
  useFeed(onFeed);

  const filters = (
    <div className="flex flex-wrap gap-1">
      {(["open", "handled", "all"] as StatusFilter[]).map((s) => (
        <Button
          key={s}
          size="sm"
          variant={status === s ? "select" : "default"}
          aria-pressed={status === s}
          onClick={() => setStatus(s)}
        >
          {t(`alerts.status.${s}`)}
        </Button>
      ))}
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm dark:bg-background_alt"
        value={level}
        aria-label={t("alerts.level.all")}
        onChange={(e) => setLevel(e.target.value as LevelFilter)}
      >
        {(["all", "urgent", "normal"] as LevelFilter[]).map((l) => (
          <option key={l} value={l}>
            {t(`alerts.level.${l}`)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Shell tab="alerts" aside={filters}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-block size-2 rounded-full",
            connected ? "bg-success" : "bg-unsaved",
          )}
        />
        {connected ? t("alerts.liveOn") : t("alerts.liveOff")}
      </div>
      {error && <LoadError error={error} />}
      {isLoading && !data && <ActivityIndicator />}
      {data && data.length === 0 && (
        <Empty>
          {status === "open" ? t("alerts.noneOpen") : t("alerts.none")}
        </Empty>
      )}
      {data && data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              focused={focusId === String(alert.id)}
              onChanged={() => {
                void mutate();
                void refreshCounts();
              }}
              onFocusDone={() => {
                if (focusId) {
                  params.delete("id");
                  setParams(params, { replace: true });
                }
              }}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

type CardProps = {
  alert: Alert;
  focused: boolean;
  onChanged: () => void;
  onFocusDone: () => void;
};

function AlertCard({ alert, focused, onChanged, onFocusDone }: CardProps) {
  const { t } = useTranslation([SW_NS]);
  const isAdmin = useIsAdmin();
  const ref = useRef<HTMLDivElement>(null);
  const [notesOpen, setNotesOpen] = useState(focused);
  const [busy, setBusy] = useState(false);
  const [knownOpen, setKnownOpen] = useState(false);

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
      const timer = setTimeout(onFocusDone, 3000);
      return () => clearTimeout(timer);
    }
  }, [focused, onFocusDone]);

  const handle = async () => {
    setBusy(true);
    try {
      await sw.post(`alerts/${alert.id}/handle`);
      toast.success(t("alerts.toast.handledOk"), { toasterId: SW_TOASTER });
      onChanged();
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setBusy(false);
    }
  };

  const clipUrl = frigateEventUrl(alert.review_id, alert.frigate_event_id);
  const canMarkKnown =
    isAdmin &&
    alert.frigate_event_id !== null &&
    alert.face_status !== "known" &&
    alert.rule_key !== "camera_offline";
  const faceLine =
    alert.face_status === null
      ? null
      : alert.face_status === "known"
        ? alert.face_name
        : t(`alerts.face.${alert.face_status}`);

  return (
    <article
      ref={ref}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-background_alt",
        alert.status === "open" && alert.level === "urgent"
          ? "border-danger/60"
          : "border-secondary",
        focused && "ring-2 ring-selected",
      )}
    >
      <div className="relative aspect-video bg-black">
        {alert.snapshot_url ? (
          <img
            src={`${SW_BASE}alerts/${alert.id}/snapshot.jpg`}
            alt={alert.title}
            loading="lazy"
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            {t("common.camera")}: {alert.camera_display}
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <LevelBadge level={alert.level} />
          {alert.status === "handled" && (
            <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs">
              {t("alerts.status.handled")}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <div className="font-medium leading-tight">{alert.title}</div>
          <div className="text-xs text-muted-foreground">
            {alert.camera_display} ·{" "}
            <TimeText seconds={toSeconds(alert.created_at)} />
            {faceLine && <> · {faceLine}</>}
          </div>
        </div>
        <p className="text-sm">{alert.description}</p>
        <div className="text-xs text-muted-foreground">
          {alert.description_source === "vlm"
            ? t("alerts.described")
            : t("alerts.fallback")}
          {alert.escalation_step > 0 && (
            <> · {t("alerts.escalated", { step: alert.escalation_step })}</>
          )}
          {alert.status === "handled" && alert.handled_by && (
            <>
              {" "}
              · {t("alerts.handledBy", { name: alert.handled_by })}
              {alert.handled_at && (
                <>
                  {" "}
                  <TimeText
                    seconds={toSeconds(alert.handled_at)}
                    style="time"
                  />
                </>
              )}
            </>
          )}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {alert.status === "open" && (
            <Button size="sm" variant="select" disabled={busy} onClick={handle}>
              <LuCheck className="mr-1 size-4" />
              {t("alerts.handle")}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNotesOpen((v) => !v)}
            aria-expanded={notesOpen}
          >
            <LuMessageSquare className="mr-1 size-4" />
            {t("alerts.notes")}
            {alert.note_count > 0 && ` (${alert.note_count})`}
          </Button>
          {clipUrl && (
            <Button size="sm" variant="outline" asChild>
              <Link to={clipUrl}>
                <LuExternalLink className="mr-1 size-4" />
                {t("alerts.viewClip")}
              </Link>
            </Button>
          )}
          {canMarkKnown && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKnownOpen(true)}
            >
              <LuUserPlus className="mr-1 size-4" />
              {t("alerts.markKnown")}
            </Button>
          )}
        </div>
        {notesOpen && <Notes alert={alert} onChanged={onChanged} />}
      </div>
      {canMarkKnown && (
        <MarkKnownDialog
          alert={alert}
          open={knownOpen}
          onClose={() => setKnownOpen(false)}
          onDone={onChanged}
        />
      )}
    </article>
  );
}

function Notes({ alert, onChanged }: { alert: Alert; onChanged: () => void }) {
  const { t } = useTranslation([SW_NS]);
  const { data, mutate } = useSw<Alert>(`alerts/${alert.id}`);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!text.trim()) {
      return;
    }
    setBusy(true);
    try {
      await sw.post(`alerts/${alert.id}/notes`, { text: text.trim() });
      setText("");
      await mutate();
      onChanged();
      toast.success(t("alerts.toast.noteOk"), { toasterId: SW_TOASTER });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setBusy(false);
    }
  };

  const notes = data?.notes ?? [];
  return (
    <div className="flex flex-col gap-2 border-t border-secondary pt-2">
      {notes.length === 0 && (
        <div className="text-xs text-muted-foreground">
          {t("alerts.noNotes")}
        </div>
      )}
      {notes.map((n) => (
        <div key={n.id} className="text-sm">
          <span className="font-medium">{n.user_name}</span>{" "}
          <span className="text-xs text-muted-foreground">
            <TimeText seconds={toSeconds(n.created_at)} style="time" />
          </span>
          <div>{n.text}</div>
        </div>
      ))}
      <Textarea
        value={text}
        rows={2}
        placeholder={t("alerts.notePlaceholder")}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={busy || !text.trim()} onClick={add}>
          {t("alerts.addNote")}
        </Button>
      </div>
    </div>
  );
}

function MarkKnownDialog({
  alert,
  open,
  onClose,
  onDone,
}: {
  alert: Alert;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation([SW_NS]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await sw.post<{ name: string; message: string }>(
        `alerts/${alert.id}/mark-known`,
        { name },
      );
      toast.success(t("alerts.markKnownDone", { name: res.data.name }), {
        toasterId: SW_TOASTER,
        description: res.data.message,
      });
      onDone();
      onClose();
      // The face library view caches its list; nudge the known-face list for next time.
      void swFetcher("me").catch(() => {});
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("alerts.markKnownTitle")}</DialogTitle>
          <DialogDescription>{t("alerts.markKnownDesc")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`known-${alert.id}`}>
            {t("alerts.markKnownName")}
          </Label>
          <Input
            id={`known-${alert.id}`}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) void submit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="select"
            disabled={busy || !name.trim()}
            onClick={submit}
          >
            {t("alerts.markKnown")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
