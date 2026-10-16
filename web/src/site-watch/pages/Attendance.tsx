import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LuChevronLeft, LuChevronRight, LuExternalLink } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { SW_NS } from "../i18n";
import { DailySummary, Movement, frigateEventUrl, useSw } from "../api";
import Shell, { Empty, LoadError, Panel } from "../components/Shell";
import { TimeText } from "../components/bits";
import { useCameraName } from "../components/hooks";

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { t } = useTranslation([SW_NS]);
  // undefined = today in the site's timezone (the back end picks it).
  const [date, setDate] = useState<string | undefined>(undefined);
  const path = date ? `attendance?date=${date}` : "attendance";
  const { data, error, isLoading } = useSw<DailySummary>(path);
  const summaryPath = date ? `summary?date=${date}` : "summary";
  const { data: summary } = useSw<{ date: string; text: string }>(summaryPath);
  const cameraName = useCameraName();
  const shown = data?.date ?? date ?? "";

  const picker = (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        aria-label={t("attendance.prev")}
        disabled={!shown}
        onClick={() => setDate(shiftDate(shown, -1))}
      >
        <LuChevronLeft className="size-4" />
      </Button>
      <input
        type="date"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm dark:bg-background_alt"
        value={shown}
        aria-label={t("attendance.date")}
        onChange={(e) => setDate(e.target.value || undefined)}
      />
      <Button
        size="sm"
        variant="outline"
        aria-label={t("attendance.next")}
        disabled={!shown}
        onClick={() => setDate(shiftDate(shown, 1))}
      >
        <LuChevronRight className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDate(undefined)}>
        {t("attendance.today")}
      </Button>
    </div>
  );

  const camerasUp = useMemo(
    () => data?.cameras.filter((c) => c.status === "online").length ?? 0,
    [data],
  );

  return (
    <Shell tab="attendance" aside={picker} intro={t("attendance.intro")}>
      {error && <LoadError error={error} />}
      {isLoading && !data && <ActivityIndicator />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile
              label={t("attendance.tiles.people")}
              value={data.people.length}
            />
            <Tile
              label={t("attendance.tiles.unknown")}
              value={data.unknown_entered}
              tone={data.unknown_entered > 0 ? "warn" : undefined}
            />
            <Tile
              label={t("attendance.tiles.alerts")}
              value={data.alerts.urgent + data.alerts.normal}
              detail={t("attendance.tiles.alertsDetail", data.alerts)}
              tone={data.alerts.open > 0 ? "warn" : undefined}
            />
            <Tile
              label={t("attendance.tiles.cameras")}
              value={`${camerasUp}/${data.cameras.length}`}
              tone={camerasUp < data.cameras.length ? "warn" : undefined}
            />
          </div>

          <Panel title={t("attendance.people")}>
            {data.people.length === 0 ? (
              <Empty>{t("attendance.noPeople")}</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2 font-medium">
                      {t("attendance.columns.name")}
                    </th>
                    <th className="py-1 pr-2 font-medium">
                      {t("attendance.columns.first")}
                    </th>
                    <th className="py-1 pr-2 font-medium">
                      {t("attendance.columns.last")}
                    </th>
                    <th className="py-1 pr-2 text-right font-medium">
                      {t("attendance.columns.in")}
                    </th>
                    <th className="py-1 text-right font-medium">
                      {t("attendance.columns.out")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.people.map((p) => (
                    <tr key={p.name} className="border-t border-secondary">
                      <td className="py-2 pr-2 font-medium">{p.name}</td>
                      <td className="py-2 pr-2">
                        <TimeText seconds={p.first_seen} style="time" />
                      </td>
                      <td className="py-2 pr-2">
                        <TimeText seconds={p.last_seen} style="time" />
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {p.entries}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {p.exits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title={t("attendance.movements")}>
            {data.movements.length === 0 ? (
              <Empty>{t("attendance.noMovements")}</Empty>
            ) : (
              <ul className="divide-y divide-secondary">
                {data.movements.map((m) => (
                  <MovementRow key={m.event_id} m={m} cameraName={cameraName} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("attendance.cameras")}>
            <ul className="flex flex-wrap gap-2">
              {data.cameras.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm"
                >
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full",
                      c.status === "online" ? "bg-success" : "bg-danger",
                    )}
                  />
                  {cameraName(c.name) || c.display_name}
                  <span className="text-xs text-muted-foreground">
                    {t("attendance.uptime", { pct: Math.round(c.uptime_pct) })}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {summary && (
            <Panel title={t("attendance.summary")}>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("attendance.summaryIntro")}
              </p>
              <pre className="whitespace-pre-wrap rounded-md bg-secondary p-3 font-sans text-sm">
                {summary.text}
              </pre>
            </Panel>
          )}
        </>
      )}
    </Shell>
  );
}

function Tile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone?: "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-secondary bg-background_alt p-3",
        tone === "warn" && "border-unsaved/60",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function MovementRow({
  m,
  cameraName,
}: {
  m: Movement;
  cameraName: (name: string) => string;
}) {
  const { t } = useTranslation([SW_NS]);
  const who =
    m.label !== "person"
      ? t("common.vehicle")
      : (m.name ?? t("common.unknownPerson"));
  const url = frigateEventUrl(m.review_id, m.frigate_event_id);
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <TimeText
        seconds={m.time}
        style="time"
        className="w-14 shrink-0 tabular-nums"
      />
      <span
        className={cn(
          "w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium",
          m.direction === "entered"
            ? "bg-success/20 text-success"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {t(`attendance.${m.direction}`)}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className={cn(!m.name && m.label === "person" && "text-unsaved")}>
          {who}
        </span>
        <span className="text-xs text-muted-foreground">
          {" "}
          · {cameraName(m.camera)}
        </span>
      </span>
      {url && (
        <Link
          to={url}
          className="flex items-center gap-1 text-xs text-selected hover:underline"
        >
          <LuExternalLink className="size-3" />
          {t("attendance.open")}
        </Link>
      )}
    </li>
  );
}
