import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { SW_NS } from "../i18n";
import {
  RULE_KEYS,
  RULE_LEVELS,
  Rule,
  RuleLevel,
  Zone,
  errorMessage,
  sw,
  useSw,
} from "../api";
import Shell, { LoadError, Panel } from "../components/Shell";
import { useCameraName, useFrigateConfig } from "../components/hooks";
import { SW_TOASTER } from "../nav";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm dark:bg-background_alt";

export default function RulesPage() {
  const { t } = useTranslation([SW_NS]);
  const { data, error, mutate } = useSw<Rule[]>("rules");
  const { data: zones } = useSw<Zone[]>("zones");
  const { data: config } = useFrigateConfig();
  const cameraName = useCameraName();
  const [rows, setRows] = useState<Rule[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (data) {
      setRows(data);
    }
  }, [data]);

  const dirty = useMemo(
    () => rows !== null && JSON.stringify(rows) !== JSON.stringify(data),
    [rows, data],
  );

  const update = (index: number, patch: Partial<Rule>) =>
    setRows((r) =>
      r ? r.map((x, i) => (i === index ? { ...x, ...patch } : x)) : r,
    );

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    try {
      const res = await sw.put<Rule[]>("rules", rows);
      await mutate(res.data, { revalidate: false });
      toast.success(t("rules.saved"), { toasterId: SW_TOASTER });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule: Rule) => {
    if (rule.id === undefined) {
      setRows((r) => (r ? r.filter((x) => x !== rule) : r));
      return;
    }
    try {
      const res = await sw.delete<Rule[]>(`rules/${rule.id}`);
      await mutate(res.data, { revalidate: false });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    }
  };

  const cameras = Object.keys(config?.cameras ?? {}).sort();

  const aside = (
    <>
      <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
        <LuPlus className="mr-1 size-4" />
        {t("rules.addOverride")}
      </Button>
      <Button
        size="sm"
        variant="select"
        disabled={!dirty || saving}
        onClick={save}
      >
        {saving ? t("common.saving") : t("common.save")}
      </Button>
    </>
  );

  return (
    <Shell tab="rules" aside={aside} intro={t("rules.intro")}>
      {error && <LoadError error={error} />}
      {!rows && !error && <ActivityIndicator />}
      {rows && (
        <Panel className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">{t("rules.columns.rule")}</th>
                <th className="p-3 font-medium">{t("rules.columns.camera")}</th>
                <th className="p-3 font-medium">{t("rules.columns.zone")}</th>
                <th className="p-3 font-medium">
                  {t("rules.columns.enabled")}
                </th>
                <th className="p-3 font-medium">
                  {t("rules.columns.working")}
                </th>
                <th className="p-3 font-medium">{t("rules.columns.after")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const override = r.camera !== null || r.zone !== null;
                return (
                  <tr
                    key={`${r.key}-${r.camera}-${r.zone}`}
                    className="border-t border-secondary"
                  >
                    <td className="p-3 font-medium">
                      {t(`rules.names.${r.key}`)}
                    </td>
                    <td className="p-3">
                      {r.camera ? cameraName(r.camera) : t("common.allCameras")}
                    </td>
                    <td className="p-3">{r.zone ?? t("common.anyZone")}</td>
                    <td className="p-3">
                      <Switch
                        checked={r.enabled}
                        aria-label={t("rules.columns.enabled")}
                        onCheckedChange={(v) => update(i, { enabled: v })}
                      />
                    </td>
                    <td className="p-3">
                      <LevelSelect
                        value={r.level_working_hours}
                        onChange={(v) => update(i, { level_working_hours: v })}
                      />
                    </td>
                    <td className="p-3">
                      <LevelSelect
                        value={r.level_after_hours}
                        onChange={(v) => update(i, { level_after_hours: v })}
                      />
                    </td>
                    <td className="p-3 text-right">
                      {override && (
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={t("rules.removeOverride")}
                          onClick={() => remove(r)}
                        >
                          <LuTrash2 className="size-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
      {dirty && (
        <div className="text-xs text-unsaved">{t("rules.unsaved")}</div>
      )}
      <AddOverrideDialog
        open={adding}
        cameras={cameras}
        zones={zones ?? []}
        cameraName={cameraName}
        existing={rows ?? []}
        onClose={() => setAdding(false)}
        onAdd={(rule) => setRows((r) => (r ? [...r, rule] : [rule]))}
      />
    </Shell>
  );
}

function LevelSelect({
  value,
  onChange,
}: {
  value: RuleLevel;
  onChange: (v: RuleLevel) => void;
}) {
  const { t } = useTranslation([SW_NS]);
  return (
    <select
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value as RuleLevel)}
    >
      {RULE_LEVELS.map((l) => (
        <option key={l} value={l}>
          {t(`levels.${l}`)}
        </option>
      ))}
    </select>
  );
}

function AddOverrideDialog({
  open,
  cameras,
  zones,
  cameraName,
  existing,
  onClose,
  onAdd,
}: {
  open: boolean;
  cameras: string[];
  zones: Zone[];
  cameraName: (n: string) => string;
  existing: Rule[];
  onClose: () => void;
  onAdd: (rule: Rule) => void;
}) {
  const { t } = useTranslation([SW_NS]);
  const [key, setKey] = useState<string>(RULE_KEYS[1]);
  const [camera, setCamera] = useState<string>("");
  const [zone, setZone] = useState<string>("");
  const [working, setWorking] = useState<RuleLevel>("normal");
  const [after, setAfter] = useState<RuleLevel>("urgent");

  useEffect(() => {
    if (open && !camera && cameras.length) {
      setCamera(cameras[0]);
    }
  }, [open, camera, cameras]);

  const cameraZones = zones.filter((z) => z.camera === camera);
  const duplicate = existing.some(
    (r) =>
      r.key === key && (r.camera ?? "") === camera && (r.zone ?? "") === zone,
  );

  const submit = () => {
    onAdd({
      key,
      camera: camera || null,
      zone: zone || null,
      enabled: true,
      level_working_hours: working,
      level_after_hours: after,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rules.addOverride")}</DialogTitle>
          <DialogDescription>{t("rules.addOverrideDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>{t("rules.columns.rule")}</Label>
            <select
              className={selectClass}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            >
              {RULE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`rules.names.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("rules.columns.camera")}</Label>
            <select
              className={selectClass}
              value={camera}
              onChange={(e) => {
                setCamera(e.target.value);
                setZone("");
              }}
            >
              {cameras.map((c) => (
                <option key={c} value={c}>
                  {cameraName(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("rules.columns.zone")}</Label>
            <select
              className={selectClass}
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            >
              <option value="">{t("common.anyZone")}</option>
              {cameraZones.map((z) => (
                <option key={z.id} value={z.frigate_name}>
                  {z.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>{t("rules.columns.working")}</Label>
              <LevelSelect value={working} onChange={setWorking} />
            </div>
            <div className="grid gap-1">
              <Label>{t("rules.columns.after")}</Label>
              <LevelSelect value={after} onChange={setAfter} />
            </div>
          </div>
          {duplicate && (
            <div className="text-xs text-danger">
              {t("rules.overrideExists")}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="select"
            disabled={duplicate || !camera}
            onClick={submit}
          >
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
