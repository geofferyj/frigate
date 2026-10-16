// Small shared pieces: level badge, times in the site's timezone, camera display names.
import { useTranslation } from "react-i18next";
import { useFormattedTimestamp, useTimeFormat } from "@/hooks/use-date-utils";
import { cn } from "@/lib/utils";
import { SW_NS } from "../i18n";
import { Level } from "../api";
import { useFrigateConfig } from "./hooks";

export function LevelBadge({
  level,
  className,
}: {
  level: Level;
  className?: string;
}) {
  const { t } = useTranslation([SW_NS]);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        level === "urgent"
          ? "bg-danger text-white"
          : "bg-selected text-selected-foreground",
        className,
      )}
    >
      {t(`levelBadge.${level}`)}
    </span>
  );
}

type TimeProps = {
  /** Epoch seconds. */
  seconds: number;
  /** "time" = hour and minute; "day" = month, day, hour and minute; "full" = with year. */
  style?: "time" | "day" | "full";
  className?: string;
};

/** A timestamp in the site's timezone, in the user's chosen 12/24-hour format. */
export function TimeText({ seconds, style = "day", className }: TimeProps) {
  const { t } = useTranslation(["common"]);
  const { data: config } = useFrigateConfig();
  const timeFormat = useTimeFormat(config);
  const key =
    style === "time"
      ? "time.formattedTimestampHourMinute"
      : style === "full"
        ? "time.formattedTimestampMonthDayYearHourMinute"
        : "time.formattedTimestampMonthDayHourMinute";
  const text = useFormattedTimestamp(
    seconds,
    t(`${key}.${timeFormat}`, { ns: "common" }),
    config?.ui?.timezone,
  );
  return (
    <time
      className={className}
      dateTime={new Date(seconds * 1000).toISOString()}
    >
      {text}
    </time>
  );
}
