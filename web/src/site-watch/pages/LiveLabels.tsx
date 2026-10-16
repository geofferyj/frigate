// Live view with a labelled box around every tracked person and vehicle. The boxes are drawn by
// Frigate itself on its detect frames (its debug MJPEG stream, GET /api/<camera>?bbox=1), so they
// are exactly what the detector sees right now. The label is the recognised name when Frigate has
// matched a face, otherwise the object type, followed by the detection score.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuMaximize2, LuMinimize2 } from "react-icons/lu";
import { baseUrl } from "@/api/baseUrl";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { SW_NS } from "../i18n";
import Shell, { Empty } from "../components/Shell";
import { useCameraName, useFrigateConfig } from "../components/hooks";

function streamUrl(camera: string, fps: number, height: number, nonce: number) {
  const q = new URLSearchParams({
    fps: String(fps),
    height: String(height),
    bbox: "1",
    timestamp: "0",
    zones: "0",
    // Changes when the page asks for a fresh connection (after a stall).
    n: String(nonce),
  });
  return `${baseUrl}api/${encodeURIComponent(camera)}?${q.toString()}`;
}

export default function LiveLabelsPage() {
  const { t } = useTranslation([SW_NS]);
  const { data: config } = useFrigateConfig();
  const cameraName = useCameraName();
  const [focus, setFocus] = useState<string | null>(null);

  const cameras = useMemo(
    () =>
      Object.entries(config?.cameras ?? {})
        .filter(([, c]) => c.enabled !== false)
        .map(([name]) => name)
        .sort(),
    [config],
  );

  // Escape leaves the enlarged view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Shell tab="live" intro={t("live.intro")}>
      {!config && <ActivityIndicator />}
      {config && cameras.length === 0 && <Empty>{t("live.none")}</Empty>}
      {focus ? (
        <Tile
          camera={focus}
          title={cameraName(focus)}
          big
          onToggle={() => setFocus(null)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cameras.map((cam) => (
            <Tile
              key={cam}
              camera={cam}
              title={cameraName(cam)}
              onToggle={() => setFocus(cam)}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Tile({
  camera,
  title,
  big = false,
  onToggle,
}: {
  camera: string;
  title: string;
  big?: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation([SW_NS]);
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);
  // Grid tiles: lighter stream. Enlarged: the detect stream's full height at the detect rate.
  const src = streamUrl(camera, big ? 5 : 3, big ? 480 : 270, nonce);

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-lg border border-secondary bg-black",
        big && "mx-auto w-full max-w-5xl",
      )}
    >
      <button
        type="button"
        className="relative block w-full"
        onClick={onToggle}
        aria-label={
          big ? t("live.shrink") : t("live.enlarge", { camera: title })
        }
      >
        <img
          key={src}
          src={src}
          alt={title}
          className={cn(
            "w-full object-contain",
            big ? "max-h-[calc(100dvh-16rem)]" : "aspect-[4/3]",
          )}
          onError={() => {
            setFailed(true);
            // Reconnect after a pause (camera restarting, network blip).
            setTimeout(() => {
              setFailed(false);
              setNonce((n) => n + 1);
            }, 3000);
          }}
        />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {t("live.reconnecting")}
          </div>
        )}
      </button>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="font-medium">{title}</span>
        <Button
          size="xs"
          variant="ghost"
          aria-label={
            big ? t("live.shrink") : t("live.enlarge", { camera: title })
          }
          onClick={onToggle}
        >
          {big ? (
            <LuMinimize2 className="size-4" />
          ) : (
            <LuMaximize2 className="size-4" />
          )}
        </Button>
      </figcaption>
    </figure>
  );
}
