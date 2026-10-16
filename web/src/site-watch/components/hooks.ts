// Hooks shared by the Site pages.
import { useMemo } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

export function useFrigateConfig() {
  return useSWR<FrigateConfig>("config", { revalidateOnFocus: false });
}

/** Frigate's display name for a camera (friendly_name, else the config name). */
export function useCameraName() {
  const { data: config } = useFrigateConfig();
  return useMemo(
    () => (name: string | null | undefined) => {
      if (!name) {
        return "";
      }
      const cam = config?.cameras?.[name];
      return cam?.friendly_name || name.replace(/_/g, " ");
    },
    [config],
  );
}
