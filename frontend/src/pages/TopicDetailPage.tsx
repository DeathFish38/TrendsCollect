import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { HistoryWindow } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";
import PercentChange from "../components/PercentChange";
import ScoreChart from "../components/ScoreChart";
import StoryList from "../components/StoryList";
import { useToast } from "../components/Toast";
import { useDashboard } from "../hooks/useDashboard";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useNow } from "../hooks/useNow";
import { useTopicHistory } from "../hooks/useTopicHistory";
import { useTopicStories } from "../hooks/useTopicStories";
import { useDeleteTopic, useUpdateTopic } from "../hooks/useTopics";
import { formatScore, formatUtc, timeAgo } from "../lib/format";

const WINDOWS: HistoryWindow[] = ["24h", "7d", "30d"];

export default function TopicDetailPage() {
  const params = useParams();
  const topicId = Number(params.id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedWindow = searchParams.get("window");
  const activeWindow: HistoryWindow = WINDOWS.includes(requestedWindow as HistoryWindow)
    ? (requestedWindow as HistoryWindow)
    : "7d";

  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const now = useNow();
  const toast = useToast();
  const dashboard = useDashboard();
  const history = useTopicHistory(topicId, activeWindow);
  const stories = useTopicStories(topicId);
  const update = useUpdateTopic(topicId);
  const remove = useDeleteTopic();

  const dashTopic = dashboard.data?.find((topic) => topic.topicId === topicId);
  const topicRef = history.data?.topic;
  const label = dashTopic?.label ?? topicRef?.label ?? `Topic ${topicId}`;
  const keyword = dashTopic?.keyword ?? topicRef?.keyword ?? "";
  const latest = history.data?.points[history.data.points.length - 1];
  const score = dashTopic?.latestScore ?? latest?.score ?? null;
  const pct = dashTopic?.pctChange ?? null;
  const volume = dashTopic?.latestStoryCount ?? latest?.storyCount ?? null;
  const updated = dashTopic?.latestCapturedAt ?? null;
  const isActive = dashTopic?.isActive ?? true;
  const labelValue = labelDraft ?? label;
  const renameDisabled =
    update.isPending ||
    labelDraft == null ||
    labelDraft.trim() === "" ||
    labelDraft.trim() === label;

  useDocumentTitle(label);

  if (history.isError) {
    return (
      <div className="state" role="alert">
        <div>Couldn’t load this topic. It may have been removed, or the backend may be unavailable.</div>
        <div className="state__actions">
          <button className="btn btn--small" type="button" onClick={() => void history.refetch()}>
            Retry
          </button>
          <Link to="/">Back to the watchlist</Link>
        </div>
      </div>
    );
  }

  const selectWindow = (nextWindow: HistoryWindow) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextWindow === "7d") next.delete("window");
        else next.set("window", nextWindow);
        return next;
      },
      { replace: true },
    );
  };

  const rename = () => {
    update.mutate(
      { label: labelValue.trim() },
      {
        onSuccess: (topic) => {
          setLabelDraft(null);
          toast(`Renamed to ${topic.label}.`);
        },
        onError: () => toast("Couldn’t rename this topic.", "error"),
      },
    );
  };

  const toggleActive = () => {
    const nextActive = !isActive;
    update.mutate(
      { isActive: nextActive },
      {
        onSuccess: () => toast(`${label} ${nextActive ? "resumed" : "paused"}.`),
        onError: () => toast("Couldn’t update this topic.", "error"),
      },
    );
  };

  const confirmDelete = () => {
    remove.mutate(topicId, {
      onSuccess: () => {
        toast(`Deleted ${label}.`);
        navigate("/");
      },
      onError: () => toast("Couldn’t delete this topic.", "error"),
    });
  };

  return (
    <div className="detail">
      <nav className="backnav">
        <Link to="/">← Watchlist</Link>
      </nav>

      <header className="quote">
        <div className="quote__id">
          <h1 className="quote__label">{label}</h1>
          <div className="quote__keyword">
            keyword “{keyword}” · {isActive ? "active" : "paused"}
          </div>
        </div>
        <div className="quote__numbers">
          <div className="quote__score">
            {score == null ? "—" : formatScore(score)}
          </div>
          <div className="quote__pct">
            <PercentChange value={pct} size="lg" />
          </div>
          <div className="quote__meta">
            {volume ?? "—"} stories ·{" "}
            {updated ? (
              <>
                updated{" "}
                <time dateTime={updated} title={formatUtc(updated)}>
                  {timeAgo(updated, now)}
                </time>
              </>
            ) : (
              "no snapshots yet"
            )}
          </div>
        </div>
      </header>

      <div className="detail__bar">
        <div className="segmented" role="group" aria-label="History window">
          {WINDOWS.map((historyWindow) => (
            <button
              key={historyWindow}
              type="button"
              className={historyWindow === activeWindow ? "is-active" : ""}
              aria-pressed={historyWindow === activeWindow}
              onClick={() => selectWindow(historyWindow)}
            >
              {historyWindow}
            </button>
          ))}
        </div>
        <div className="manage">
          <input
            className="field"
            aria-label="Rename topic"
            value={labelValue}
            onChange={(event) => setLabelDraft(event.target.value)}
          />
          <button className="btn" type="button" disabled={renameDisabled} onClick={rename}>
            Rename
          </button>
          <button className="btn" type="button" disabled={update.isPending} onClick={toggleActive}>
            {isActive ? "Pause" : "Resume"}
          </button>
          <button
            className="btn btn--danger"
            type="button"
            disabled={remove.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="panel">
        {history.isLoading ? (
          <div className="chart-skeleton" role="status" aria-label="Loading history">
            <div className="skel chart-skeleton__plot" aria-hidden="true" />
            <div className="skel chart-skeleton__axis" aria-hidden="true" />
          </div>
        ) : (
          <ScoreChart points={history.data?.points ?? []} window={activeWindow} />
        )}
      </div>

      <div className="section-head">
        <h2>Stories</h2>
        <span className="section-head__hint">points refresh on every collect</span>
      </div>
      <StoryList
        stories={stories.data?.stories ?? []}
        isLoading={stories.isLoading}
        isError={stories.isError}
        onRetry={() => void stories.refetch()}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete “${label}”?`}
        description="This permanently removes the topic, its score history, and all captured stories."
        confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
        confirmDisabled={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
