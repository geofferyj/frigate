// Page frame shared by the Site pages: heading, tab row, scrolling body. Fills Frigate's page
// root (which is overflow-hidden), so the body does its own scrolling.
import { useContext, useEffect } from "react";
import { NavLink, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "@/context/auth-context";
import { useIsAdmin } from "@/hooks/use-is-admin";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { cn } from "@/lib/utils";
import { SW_NS } from "../i18n";
import { pageTitle } from "../branding";

export type TabKey =
  | "alerts"
  | "attendance"
  | "rules"
  | "schedule"
  | "recipients"
  | "snoozes";

const TABS: { key: TabKey; admin: boolean }[] = [
  { key: "alerts", admin: false },
  { key: "attendance", admin: false },
  { key: "rules", admin: true },
  { key: "schedule", admin: true },
  { key: "recipients", admin: true },
  { key: "snoozes", admin: true },
];

type ShellProps = {
  tab: TabKey;
  /** Right side of the heading row (filters, buttons). */
  aside?: React.ReactNode;
  intro?: string;
  children: React.ReactNode;
};

export default function Shell({ tab, aside, intro, children }: ShellProps) {
  const { t } = useTranslation([SW_NS]);
  const { auth } = useContext(AuthContext);
  const isAdmin = useIsAdmin();
  const current = TABS.find((x) => x.key === tab);

  useEffect(() => {
    document.title = pageTitle(t(`tabs.${tab}`));
  }, [t, tab]);

  if (auth.isLoading) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  if (current?.admin && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-secondary px-3 pt-3 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("section")}
            </div>
            <Heading as="h3" className="mb-0">
              {t(`tabs.${tab}`)}
            </Heading>
          </div>
          {aside && <div className="flex items-center gap-2">{aside}</div>}
        </div>
        <nav className="sw-tabs -mx-1 flex gap-1 overflow-x-auto pb-2">
          {TABS.filter((x) => !x.admin || isAdmin).map((x) => (
            <NavLink
              key={x.key}
              to={`/site-watch/${x.key}`}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                  isActive
                    ? "bg-selected font-medium text-selected-foreground"
                    : "text-secondary-foreground hover:bg-secondary",
                )
              }
            >
              {t(`tabs.${x.key}`)}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="scrollbar-container flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 md:p-4">
          {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
  actions,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-secondary bg-background_alt p-3 md:p-4",
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h4 className="text-base font-medium">{title}</h4>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-secondary p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function LoadError({ error }: { error: unknown }) {
  const { t } = useTranslation([SW_NS]);
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
      {t("common.loadFailed", { error: message })}
    </div>
  );
}
