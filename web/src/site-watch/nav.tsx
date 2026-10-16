// Menu entries for the Site pages, consumed by Frigate's useNavigation (the one upstream edit
// in src/hooks/use-navigation.ts). The Alerts icon carries the open-urgent badge, keeps the
// live feed open and shows a toast when a new urgent alert arrives, so those work on every page.
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { IconBaseProps } from "react-icons";
import { MdNotificationsActive, MdOutlineBusiness } from "react-icons/md";
import { Toaster } from "@/components/ui/sonner";
import { NavData } from "@/types/navigation";
import "./i18n";
import { SW_NS } from "./i18n";
import { brandDocumentTitles } from "./branding";
import { Alert, swFetcher } from "./api";
import {
  FeedEvent,
  refreshCounts,
  subscribeFeed,
  useAlertCounts,
} from "./feed";

export const ID_SW_ALERTS = 101;
export const ID_SW_SITE = 102;

/** Toasts from the Site pages use their own Toaster so Frigate's per-page Toasters never double them. */
export const SW_TOASTER = "site-watch";

brandDocumentTitles();

// eslint-disable-next-line react-refresh/only-export-components
function AlertsNavIcon(props: IconBaseProps) {
  const { t } = useTranslation([SW_NS]);
  const navigate = useNavigate();
  const counts = useAlertCounts();

  useEffect(() => {
    void refreshCounts();
    const onEvent = (event: FeedEvent) => {
      if (event.type !== "alert") {
        return;
      }
      void refreshCounts();
      if (event.action === "new") {
        swFetcher<Alert>(`alerts/${event.alert_id}`)
          .then((alert) => {
            if (alert.level !== "urgent") {
              return;
            }
            toast.warning(t("alerts.toast.urgent", { title: alert.title }), {
              toasterId: SW_TOASTER,
              description: alert.description,
              duration: 15000,
              action: {
                label: t("alerts.toast.view"),
                onClick: () => navigate(`/site-watch/alerts?id=${alert.id}`),
              },
            });
          })
          .catch(() => {});
      }
    };
    return subscribeFeed(onEvent);
  }, [navigate, t]);

  const count = counts.open_urgent;
  return (
    <span className="relative inline-flex">
      <MdNotificationsActive {...props} />
      {count > 0 && (
        <span className="sw-badge" aria-label={`${count}`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
      {createPortal(
        <Toaster id={SW_TOASTER} position="top-right" closeButton={true} />,
        document.body,
      )}
    </span>
  );
}

export function useSiteWatchNav(
  variant: "primary" | "secondary" = "primary",
): NavData[] {
  return useMemo(
    () => [
      {
        id: ID_SW_ALERTS,
        variant,
        icon: AlertsNavIcon,
        title: `${SW_NS}:nav.alerts`,
        url: "/site-watch/alerts",
      },
      {
        id: ID_SW_SITE,
        variant,
        icon: MdOutlineBusiness,
        title: `${SW_NS}:nav.site`,
        url: "/site-watch/attendance",
      },
    ],
    [variant],
  );
}
