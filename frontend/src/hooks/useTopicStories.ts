import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { StoriesResponse } from "../api/types";

export function useTopicStories(topicId: number, limit = 50) {
  return useQuery({
    queryKey: ["stories", topicId, limit],
    queryFn: () => api.get<StoriesResponse>(`/topics/${topicId}/stories?limit=${limit}`),
    enabled: Number.isFinite(topicId) && topicId > 0,
    refetchInterval: 60_000,
  });
}
