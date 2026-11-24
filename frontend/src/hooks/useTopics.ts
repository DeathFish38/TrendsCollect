import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Topic } from "../api/types";

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { keyword: string; label?: string }) =>
      api.post<Topic>("/topics", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTopic(topicId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { label?: string; isActive?: boolean }) =>
      api.patch<Topic>(`/topics/${topicId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["history", topicId] });
      void queryClient.invalidateQueries({ queryKey: ["stories", topicId] });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topicId: number) => api.del<void>(`/topics/${topicId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
