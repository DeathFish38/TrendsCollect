import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

/**
 * Fire POST /api/refresh (the collector runs on a background thread),
 * give it a few seconds to write new snapshots, then invalidate all
 * queries so the UI pulls fresh data.
 */
export function useRefresh() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await api.post<{ status: string; started: boolean }>("/refresh");
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      await queryClient.invalidateQueries();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing };
}
