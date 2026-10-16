import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { SW_NS } from "../i18n";
import { Day, Holiday, errorMessage, sw, useSw } from "../api";
import Shell, { Empty, LoadError, Panel } from "../components/Shell";
import { SW_TOASTER } from "../nav";

export default function SchedulePage() {
  const { t } = useTranslation([SW_NS]);
  const { data, error, mutate } = useSw<Day[]>("schedule");
  const { data: holidays, mutate: mutateHolidays } =
    useSw<Holiday[]>("holidays");
  const [days, setDays] = useState<Day[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const weekdays = t("schedule.weekdays", { returnObjects: true }) as string[];

  useEffect(() => {
    if (data) setDays(data);
  }, [data]);

  const dirty = useMemo(
    () => days !== null && JSON.stringify(days) !== JSON.stringify(data),
    [days, data],
  );

  const update = (weekday: number, patch: Partial<Day>) =>
    setDays((d) =>
      d ? d.map((x) => (x.weekday === weekday ? { ...x, ...patch } : x)) : d,
    );

  const save = async () => {
    if (!days) return;
    setSaving(true);
    try {
      const res = await sw.put<Day[]>("schedule", days);
      await mutate(res.data, { revalidate: false });
      toast.success(t("schedule.saved"), { toasterId: SW_TOASTER });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    try {
      const res = await sw.post<Holiday[]>("holidays", {
        date: newDate,
        name: newName,
      });
      await mutateHolidays(res.data, { revalidate: false });
      setNewDate("");
      setNewName("");
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    }
  };

  const removeHoliday = async (id: number) => {
    try {
      const res = await sw.delete<Holiday[]>(`holidays/${id}`);
      await mutateHolidays(res.data, { revalidate: false });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    }
  };

  const aside = (
    <Button
      size="sm"
      variant="select"
      disabled={!dirty || saving}
      onClick={save}
    >
      {saving ? t("common.saving") : t("common.save")}
    </Button>
  );

  return (
    <Shell tab="schedule" aside={aside} intro={t("schedule.intro")}>
      {error && <LoadError error={error} />}
      {!days && !error && <ActivityIndicator />}
      {days && (
        <Panel className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">{t("schedule.columns.day")}</th>
                <th className="p-3 font-medium">
                  {t("schedule.columns.working")}
                </th>
                <th className="p-3 font-medium">
                  {t("schedule.columns.start")}
                </th>
                <th className="p-3 font-medium">{t("schedule.columns.end")}</th>
              </tr>
            </thead>
            <tbody>
              {days
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((d) => (
                  <tr key={d.weekday} className="border-t border-secondary">
                    <td className="p-3 font-medium">
                      {weekdays[d.weekday] ?? d.weekday}
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={d.enabled}
                        aria-label={t("schedule.columns.working")}
                        onCheckedChange={(v) =>
                          update(d.weekday, { enabled: v })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="time"
                        className="w-32"
                        value={d.start_time}
                        disabled={!d.enabled}
                        onChange={(e) =>
                          update(d.weekday, { start_time: e.target.value })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="time"
                        className="w-32"
                        value={d.end_time}
                        disabled={!d.enabled}
                        onChange={(e) =>
                          update(d.weekday, { end_time: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title={t("schedule.holidays")}>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("schedule.holidaysIntro")}
        </p>
        {holidays && holidays.length === 0 && (
          <Empty>{t("schedule.noHolidays")}</Empty>
        )}
        {holidays && holidays.length > 0 && (
          <ul className="mb-3 divide-y divide-secondary">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-28 tabular-nums">{h.date}</span>
                <span className="flex-1">{h.name}</span>
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label={t("common.remove")}
                  onClick={() => removeHoliday(h.id)}
                >
                  <LuTrash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">
              {t("schedule.holidayDate")}
            </span>
            <Input
              type="date"
              className="w-40"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-1">
            <span className="text-xs text-muted-foreground">
              {t("schedule.holidayName")}
            </span>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            disabled={!newDate || !newName.trim()}
            onClick={addHoliday}
          >
            {t("common.add")}
          </Button>
        </div>
      </Panel>
    </Shell>
  );
}
