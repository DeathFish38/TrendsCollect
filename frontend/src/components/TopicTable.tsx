import { useEffect, useMemo, useState } from "react";
import type { DashboardTopic } from "../api/types";
import { useCreateTopic } from "../hooks/useTopics";
import { useNow } from "../hooks/useNow";
import { parseUtc } from "../lib/format";
import TopicRow from "./TopicRow";
import { useToast } from "./Toast";

interface TopicTableProps {
  topics: DashboardTopic[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}

type SortKey = "default" | "score" | "pctChange" | "volume" | "updated";
type SortableKey = Exclude<SortKey, "default">;
type SortDirection = "asc" | "desc";
type SortState = { key: SortKey; direction: SortDirection };

const SKELETON_ROWS = 5;
const COLUMNS = 7;
const SORT_STORAGE_KEY = "trendscollect.watchlist.sort";
const SORT_KEYS: SortKey[] = ["default", "score", "pctChange", "volume", "updated"];
const STARTER_KEYWORDS = ["rust", "wasm", "postgres", "react", "kubernetes", "ai"];

function readSort(): SortState {
  try {
    const parsed = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) ?? "null") as Partial<SortState> | null;
    if (
      parsed &&
      SORT_KEYS.includes(parsed.key ?? "default") &&
      (parsed.direction === "asc" || parsed.direction === "desc")
    ) {
      return { key: parsed.key ?? "default", direction: parsed.direction };
    }
  } catch {
    // Storage can be unavailable in private browsing; default order still works.
  }
  return { key: "default", direction: "desc" };
}

function sortValue(topic: DashboardTopic, key: SortableKey): number | null {
  switch (key) {
    case "score":
      return topic.latestScore;
    case "pctChange":
      return topic.pctChange;
    case "volume":
      return topic.latestStoryCount;
    case "updated":
      return topic.latestCapturedAt ? parseUtc(topic.latestCapturedAt).getTime() : null;
  }
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: COLUMNS }).map((_, col) => (
            <td key={col}>
              <div
                className="skel"
                style={{ width: `${55 + ((row + col) % 3) * 15}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortableKey;
  sort: SortState;
  onSort: (key: SortableKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        className={`sort-button${active ? " is-active" : ""}`}
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}, ${active ? (sort.direction === "asc" ? "ascending" : "descending") : "not sorted"}`}
      >
        {label}
        <span className="sort-button__indicator" aria-hidden="true">
          {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/** The watchlist — stock-terminal table, the product's centerpiece. */
export default function TopicTable({
  topics,
  isLoading,
  error,
  onRetry,
  isRetrying,
}: TopicTableProps) {
  const [sort, setSort] = useState<SortState>(readSort);
  const now = useNow();
  const create = useCreateTopic();
  const toast = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
    } catch {
      // Sorting remains functional for this session without persistence.
    }
  }, [sort]);

  const sortedTopics = useMemo(() => {
    if (sort.key === "default") return topics;
    const key = sort.key;
    return [...topics].sort((a, b) => {
      const aValue = sortValue(a, key);
      const bValue = sortValue(b, key);
      if (aValue == null && bValue == null) return a.label.localeCompare(b.label);
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      const result = aValue - bValue;
      if (result === 0) return a.label.localeCompare(b.label);
      return sort.direction === "asc" ? result : -result;
    });
  }, [sort, topics]);

  const toggleSort = (key: SortableKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "desc" ? "asc" : "desc" }
        : { key, direction: "desc" },
    );
  };

  const addStarter = (keyword: string) => {
    create.mutate(
      { keyword },
      {
        onSuccess: (topic) => toast(`Added ${topic.label}. First snapshot is on its way.`),
        onError: (createError) =>
          toast(createError instanceof Error ? createError.message : "Failed to add topic.", "error"),
      },
    );
  };

  return (
    <div className="table-wrap">
      <table className="watchlist">
        <thead>
          <tr>
            <th scope="col" className="col-topic">Topic</th>
            <SortableHeader label="Score" sortKey="score" sort={sort} onSort={toggleSort} />
            <SortableHeader label="24h %" sortKey="pctChange" sort={sort} onSort={toggleSort} />
            <SortableHeader label="Volume" sortKey="volume" sort={sort} onSort={toggleSort} />
            <th scope="col" className="col-trend">Trend (48 ticks)</th>
            <SortableHeader label="Last Updated" sortKey="updated" sort={sort} onSort={toggleSort} />
            <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {error != null ? (
            <tr className="state-row">
              <td colSpan={COLUMNS}>
                <div>Couldn’t load the watchlist — is the backend running on port 5001?</div>
                <button className="btn btn--small state__retry" type="button" onClick={onRetry} disabled={isRetrying}>
                  {isRetrying ? "Retrying…" : "Retry"}
                </button>
              </td>
            </tr>
          ) : isLoading ? (
            <SkeletonRows />
          ) : topics.length === 0 ? (
            <tr className="state-row">
              <td colSpan={COLUMNS}>
                <div>Your watchlist is empty. Add a keyword above or start with one of these:</div>
                <div className="starter-topics" aria-label="Suggested topics">
                  {STARTER_KEYWORDS.map((keyword) => (
                    <button
                      className="starter-chip"
                      type="button"
                      key={keyword}
                      disabled={create.isPending}
                      onClick={() => addStarter(keyword)}
                    >
                      {create.isPending && create.variables.keyword === keyword ? "Adding…" : keyword}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ) : (
            sortedTopics.map((topic) => <TopicRow key={topic.topicId} topic={topic} now={now} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
