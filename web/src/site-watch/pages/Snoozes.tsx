import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { SW_NS } from "../i18n";
import { RULE_KEYS, Snooze, errorMessage, sw, toSeconds, useSw } from "../api";
import Shell, { Empty, LoadError, Panel } from "../components/Shell";
import { TimeText } from "../components/bits";
import { useCameraName, useFrigateConfig } from "../components/hooks";
import { SW_TOASTER } from "../nav";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-2 text-sm dark:bg-background_alt";

const DURATIONS = ["30", "60", "240", "720", "forever"] as const;

export default function SnoozesPage() {
  const { t } = useTranslation([SW_NS]);
  const { data, error, mutate } = useSw<Snooze[]>("snoozes");
  const { data: config } = useFrigateConfig();
  const cameraName = useCameraName();
  const [camera, setCamera] = useState("");
  const [rule, setRule] = useState("");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("60");
  const [busy, setBusy] = useState(false);

  const cameras = Object.keys(config?.cameras ?? {}).sort();

  const create = async () => {
    setBusy(true);
    try {
      const res = await sw.post<Snooze[]>("snoozes", {
        camera: camera || null,
        rule_key: rule || null,
        minutes: duration === "forever" ? null : Number(duration),
      });
      await mutate(res.data, { revalidate: false });
      toast.success(t("snoozes.created"), { toasterId: SW_TOASTER });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await sw.delete<Snooze[]>(`snoozes/${id}`);
      await mutate(res.data, { revalidate: false });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    }
  };

  return (
    <Shell tab="snoozes" intro={t("snoozes.intro")}>
      <Panel title={t("snoozes.add")}>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-1">
            <Label>{t("snoozes.columns.camera")}</Label>
            <select
              className={selectClass}
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
            >
              <option value="">{t("common.allCameras")}</option>
              {cameras.map((c) => (
                <option key={c} value={c}>
                  {cameraName(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("snoozes.columns.rule")}</Label>
            <select
              className={selectClass}
              value={rule}
              onChange={(e) => setRule(e.target.value)}
            >
              <option value="">{t("common.allRules")}</option>
              {RULE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`rules.names.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("snoozes.duration")}</Label>
            <select
              className={selectClass}
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value as (typeof DURATIONS)[number])
              }
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {t(`snoozes.durations.${d}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="select"
              className="w-full"
              disabled={busy}
              onClick={create}
            >
              {t("snoozes.add")}
            </Button>
          </div>
        </div>
      </Panel>

      {error && <LoadError error={error} />}
      {!data && !error && <ActivityIndicator />}
      {data && data.length === 0 && <Empty>{t("snoozes.none")}</Empty>}
      {data && data.length > 0 && (
        <Panel className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">
                  {t("snoozes.columns.camera")}
                </th>
                <th className="p-3 font-medium">{t("snoozes.columns.rule")}</th>
                <th className="p-3 font-medium">
                  {t("snoozes.columns.until")}
                </th>
                <th className="p-3 font-medium">{t("snoozes.columns.by")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-t border-secondary">
                  <td className="p-3 font-medium">
                    {s.camera ? cameraName(s.camera) : t("common.allCameras")}
                  </td>
                  <td className="p-3">
                    {s.rule_key
                      ? t(`rules.names.${s.rule_key}`)
                      : t("common.allRules")}
                  </td>
                  <td className="p-3">
                    {s.until ? (
                      <TimeText seconds={toSeconds(s.until)} />
                    ) : (
                      t("common.untilRemoved")
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{s.created_by}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={t("common.remove")}
                      onClick={() => remove(s.id)}
                    >
                      <LuTrash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </Shell>
  );
}
