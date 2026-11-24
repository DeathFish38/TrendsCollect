// API DTO types — mirror the backend controllers exactly.
// Nullable fields match backend behavior: a topic with no snapshots yet
// (e.g. freshly added, or the collector never ran) serializes as null.

export interface Topic {
  topicId: number;
  keyword: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

export interface TopicRef {
  topicId: number;
  keyword: string;
  label: string;
}

export interface SparkPoint {
  capturedAt: string;
  score: number;
}

export interface DashboardTopic {
  topicId: number;
  keyword: string;
  label: string;
  isActive: boolean;
  latestScore: number | null;
  latestStoryCount: number | null;
  latestCapturedAt: string | null;
  score24hAgo: number | null;
  pctChange: number | null;
  sparkline: SparkPoint[];
}

export type HistoryWindow = "24h" | "7d" | "30d";

export interface HistoryPoint {
  capturedAt: string;
  score: number;
  storyCount: number;
}

export interface HistoryResponse {
  topic: TopicRef;
  window: HistoryWindow;
  points: HistoryPoint[];
}

export interface Story {
  id: number;
  title: string;
  url: string | null;
  author: string | null;
  points: number;
  numComments: number;
  createdAt: string;
}

export interface StoriesResponse {
  topic: TopicRef;
  stories: Story[];
}

export interface HealthResponse {
  status: "ok" | "degraded";
  db: boolean;
  schedulerRunning: boolean;
  topicCount: number;
}
