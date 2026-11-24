import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DashboardTopic } from "../api/types";
import { useDeleteTopic, useUpdateTopic } from "../hooks/useTopics";
import { formatScore, formatUtc, timeAgo } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog";
import PercentChange from "./PercentChange";
import Sparkline from "./Sparkline";
import { useToast } from "./Toast";

export default function TopicRow({ topic, now }: { topic: DashboardTopic; now: number }) {
  const navigate = useNavigate();
  const toast = useToast();
  const update = useUpdateTopic(topic.topicId);
  const remove = useDeleteTopic();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const previous = useRef({ score: topic.latestScore, pct: topic.pctChange });
  const scoreChanged = previous.current.score !== topic.latestScore;
  const pctChanged = previous.current.pct !== topic.pctChange;
  const pct = topic.pctChange;
  const direction = pct == null || pct === 0 ? "flat" : pct > 0 ? "up" : "down";
  const detailPath = `/topics/${topic.topicId}`;

  useEffect(() => {
    previous.current = { score: topic.latestScore, pct: topic.pctChange };
  }, [topic.latestScore, topic.pctChange]);

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(detailPath);
    }
  };

  const toggleActive = () => {
    const nextActive = !topic.isActive;
    update.mutate(
      { isActive: nextActive },
      {
        onSuccess: () => toast(`${topic.label} ${nextActive ? "resumed" : "paused"}.`),
        onError: () => toast(`Couldn’t update ${topic.label}.`, "error"),
      },
    );
  };

  const confirmDelete = () => {
    remove.mutate(topic.topicId, {
      onSuccess: () => {
        setDeleteOpen(false);
        toast(`Deleted ${topic.label}.`);
      },
      onError: () => toast(`Couldn’t delete ${topic.label}.`, "error"),
    });
  };

  return (
    <tr
      className="topic-row"
      tabIndex={0}
      aria-label={`Open ${topic.label} details`}
      onClick={() => navigate(detailPath)}
      onKeyDown={onRowKeyDown}
    >
      <th scope="row" className="topic-name">
        <Link to={detailPath} onClick={(event) => event.stopPropagation()}>
          {topic.label}
        </Link>
        {!topic.isActive && <span className="tag-paused">paused</span>}
        <span className="topic-keyword">{topic.keyword}</span>
      </th>
      <td className="num">
        <span
          key={`${topic.latestCapturedAt}-${topic.latestScore}`}
          className={scoreChanged ? "value-flash" : undefined}
        >
          {topic.latestScore == null ? "—" : formatScore(topic.latestScore)}
        </span>
      </td>
      <td className="num">
        <span
          key={`${topic.latestCapturedAt}-${topic.pctChange}`}
          className={pctChanged ? "value-flash" : undefined}
        >
          <PercentChange value={pct} />
        </span>
      </td>
      <td className="num">{topic.latestStoryCount ?? "—"}</td>
      <td className="col-trend">
        <Sparkline points={topic.sparkline} direction={direction} />
      </td>
      <td className="num num--muted">
        {topic.latestCapturedAt ? (
          <time dateTime={topic.latestCapturedAt} title={formatUtc(topic.latestCapturedAt)}>
            {timeAgo(topic.latestCapturedAt, now)}
          </time>
        ) : (
          "—"
        )}
      </td>
      <td
        className="row-actions"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          className="row-action"
          type="button"
          disabled={update.isPending}
          onClick={toggleActive}
          aria-label={`${topic.isActive ? "Pause" : "Resume"} ${topic.label}`}
        >
          {topic.isActive ? "Pause" : "Resume"}
        </button>
        <button
          className="row-action row-action--danger"
          type="button"
          disabled={remove.isPending}
          onClick={() => setDeleteOpen(true)}
          aria-label={`Delete ${topic.label}`}
        >
          Delete
        </button>
        <ConfirmDialog
          open={deleteOpen}
          title={`Delete “${topic.label}”?`}
          description="This permanently removes the topic, its score history, and all captured stories."
          confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
          confirmDisabled={remove.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteOpen(false)}
        />
      </td>
    </tr>
  );
}
