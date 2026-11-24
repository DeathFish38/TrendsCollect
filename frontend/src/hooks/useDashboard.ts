import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DashboardTopic } from "../api/types";

/** The watchlist payload — one call powers the whole table. Polls every 30s. */
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardTopic[]>("/dashboard"),
    refetchInterval: 30_000,
  });
}
