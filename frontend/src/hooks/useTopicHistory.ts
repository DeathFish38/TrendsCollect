import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { HistoryResponse, HistoryWindow } from "../api/types";

export function useTopicHistory(topicId: number, window: HistoryWindow) {
  return useQuery({
    queryKey: ["history", topicId, window],
    queryFn: () => api.get<HistoryResponse>(`/topics/${topicId}/history?window=${window}`),
    enabled: Number.isFinite(topicId) && topicId > 0,
    refetchInterval: 30_000,
  });
}
