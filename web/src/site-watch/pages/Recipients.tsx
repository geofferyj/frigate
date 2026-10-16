import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { SW_NS } from "../i18n";
import { Level, Recipient, errorMessage, sw, useSw } from "../api";
import Shell, { Empty, LoadError, Panel } from "../components/Shell";
import { SW_TOASTER } from "../nav";

type Form = {
  name: string;
  telegram_chat_id: string;
  min_level: Level;
  escalation_order: string;
  active: boolean;
};

const empty: Form = {
  name: "",
  telegram_chat_id: "",
  min_level: "normal",
  escalation_order: "0",
  active: true,
};

export default function RecipientsPage() {
  const { t } = useTranslation([SW_NS]);
  const { data, error, mutate } = useSw<Recipient[]>("recipients");
  const [editing, setEditing] = useState<{ id?: number; form: Form } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Recipient | null>(null);

  const startEdit = (r?: Recipient) =>
    setEditing(
      r
        ? {
            id: r.id,
            form: {
              name: r.name,
              telegram_chat_id: String(r.telegram_chat_id),
              min_level: r.min_level,
              escalation_order: String(r.escalation_order),
              active: r.active,
            },
          }
        : { form: empty },
    );

  const submit = async () => {
    if (!editing) return;
    const body = {
      name: editing.form.name,
      telegram_chat_id: Number(editing.form.telegram_chat_id),
      min_level: editing.form.min_level,
      escalation_order: Number(editing.form.escalation_order) || 0,
      active: editing.form.active,
    };
    try {
      const res =
        editing.id === undefined
          ? await sw.post<Recipient[]>("recipients", body)
          : await sw.put<Recipient[]>(`recipients/${editing.id}`, body);
      await mutate(res.data, { revalidate: false });
      setEditing(null);
      toast.success(t("common.saved"), { toasterId: SW_TOASTER });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const res = await sw.delete<Recipient[]>(`recipients/${deleting.id}`);
      await mutate(res.data, { revalidate: false });
    } catch (e) {
      toast.error(t("common.failed", { error: errorMessage(e) }), {
        toasterId: SW_TOASTER,
      });
    } finally {
      setDeleting(null);
    }
  };

  const aside = (
    <Button size="sm" variant="select" onClick={() => startEdit()}>
      <LuPlus className="mr-1 size-4" />
      {t("recipients.add")}
    </Button>
  );

  const valid =
    editing !== null &&
    editing.form.name.trim() !== "" &&
    /^-?\d+$/.test(editing.form.telegram_chat_id.trim());

  return (
    <Shell tab="recipients" aside={aside} intro={t("recipients.intro")}>
      {error && <LoadError error={error} />}
      {!data && !error && <ActivityIndicator />}
      {data && data.length === 0 && <Empty>{t("recipients.none")}</Empty>}
      {data && data.length > 0 && (
        <Panel className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">
                  {t("recipients.columns.name")}
                </th>
                <th className="p-3 font-medium">
                  {t("recipients.columns.chatId")}
                </th>
                <th className="p-3 font-medium">
                  {t("recipients.columns.minLevel")}
                </th>
                <th className="p-3 font-medium">
                  {t("recipients.columns.order")}
                </th>
                <th className="p-3 font-medium">
                  {t("recipients.columns.active")}
                </th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-secondary">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 tabular-nums">{r.telegram_chat_id}</td>
                  <td className="p-3">
                    {t(`recipients.minLevel.${r.min_level}`)}
                  </td>
                  <td className="p-3 tabular-nums">{r.escalation_order}</td>
                  <td className="p-3">
                    {r.active ? t("common.yes") : t("common.no")}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={t("common.edit")}
                      onClick={() => startEdit(r)}
                    >
                      <LuPencil className="size-4" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleting(r)}
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

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id === undefined
                ? t("recipients.add")
                : t("recipients.edit")}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="rc-name">{t("recipients.columns.name")}</Label>
                <Input
                  id="rc-name"
                  value={editing.form.name}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="rc-chat">
                  {t("recipients.columns.chatId")}
                </Label>
                <Input
                  id="rc-chat"
                  inputMode="numeric"
                  value={editing.form.telegram_chat_id}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: {
                        ...editing.form,
                        telegram_chat_id: e.target.value,
                      },
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {t("recipients.chatIdHelp")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="rc-level">
                    {t("recipients.columns.minLevel")}
                  </Label>
                  <select
                    id="rc-level"
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm dark:bg-background_alt"
                    value={editing.form.min_level}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: {
                          ...editing.form,
                          min_level: e.target.value as Level,
                        },
                      })
                    }
                  >
                    <option value="normal">
                      {t("recipients.minLevel.normal")}
                    </option>
                    <option value="urgent">
                      {t("recipients.minLevel.urgent")}
                    </option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="rc-order">
                    {t("recipients.columns.order")}
                  </Label>
                  <Input
                    id="rc-order"
                    type="number"
                    min={0}
                    value={editing.form.escalation_order}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: {
                          ...editing.form,
                          escalation_order: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="rc-active"
                  checked={editing.form.active}
                  onCheckedChange={(v) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, active: v },
                    })
                  }
                />
                <Label htmlFor="rc-active">
                  {t("recipients.columns.active")}
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="select" disabled={!valid} onClick={submit}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("recipients.confirmDelete", { name: deleting?.name ?? "" })}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
