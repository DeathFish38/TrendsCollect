import AddTopicForm from "../components/AddTopicForm";
import TopicTable from "../components/TopicTable";
import { useDashboard } from "../hooks/useDashboard";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatPctChange } from "../lib/format";

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useDashboard();
  const topics = data ?? [];
  const up = topics.filter((topic) => (topic.pctChange ?? 0) > 0).length;
  const down = topics.filter((topic) => (topic.pctChange ?? 0) < 0).length;
  const flat = topics.length - up - down;
  const movers = topics.filter((topic) => topic.pctChange != null);
  const topMover = movers.reduce<(typeof topics)[number] | null>(
    (best, topic) =>
      !best || Math.abs(topic.pctChange ?? 0) > Math.abs(best.pctChange ?? 0) ? topic : best,
    null,
  );

  useDocumentTitle("Watchlist");

  return (
    <section>
      <div className="section-head">
        <h2>Watchlist</h2>
        <span className="section-head__hint">
          score = stories × 10 + capped points · trailing 24h
        </span>
      </div>
      <AddTopicForm />
      {topics.length > 0 && (
        <div className="market-summary" aria-label="Watchlist summary">
          {topics.length} {topics.length === 1 ? "topic" : "topics"} · {up}▲ {down}▼ {flat}—
          {topMover && (
            <>
              {" "}· top mover <strong>{topMover.label}</strong>{" "}
              {formatPctChange(topMover.pctChange ?? 0)}
            </>
          )}
        </div>
      )}
      <TopicTable
        topics={topics}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    </section>
  );
}
