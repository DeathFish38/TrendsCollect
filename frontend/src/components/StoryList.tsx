import { useMemo, useState } from "react";
import type { Story } from "../api/types";
import { useNow } from "../hooks/useNow";
import { parseUtc } from "../lib/format";
import StoryCard from "./StoryCard";

type StorySort = "newest" | "points" | "comments";

const SORT_OPTIONS: { value: StorySort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "points", label: "Points" },
  { value: "comments", label: "Comments" },
];

interface StoryListProps {
  stories: Story[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function StorySkeletons() {
  return (
    <div className="story-list" role="status" aria-label="Loading stories">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="story story--skeleton" key={index} aria-hidden="true">
          <div className="skel story__skel-title" />
          <div className="skel story__skel-title story__skel-title--short" />
          <div className="skel story__skel-meta" />
        </div>
      ))}
    </div>
  );
}

export default function StoryList({
  stories,
  isLoading = false,
  isError = false,
  onRetry,
}: StoryListProps) {
  const [sort, setSort] = useState<StorySort>("newest");
  const now = useNow();

  const sortedStories = useMemo(() => {
    return [...stories].sort((a, b) => {
      if (sort === "points") return b.points - a.points;
      if (sort === "comments") return b.numComments - a.numComments;
      return parseUtc(b.createdAt).getTime() - parseUtc(a.createdAt).getTime();
    });
  }, [sort, stories]);

  if (isLoading) return <StorySkeletons />;

  if (isError) {
    return (
      <div className="state" role="alert">
        <div>Couldn’t load stories for this topic.</div>
        {onRetry && (
          <button className="btn btn--small state__retry" type="button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (stories.length === 0) {
    return <div className="state">No stories captured yet for this topic.</div>;
  }

  return (
    <div className="story-feed">
      <div className="story-toolbar">
        <span className="story-toolbar__count">
          {stories.length} {stories.length === 1 ? "story" : "stories"}
        </span>
        <div className="segmented segmented--small" role="group" aria-label="Sort stories">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={sort === option.value ? "is-active" : ""}
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="story-list">
        {sortedStories.map((story) => (
          <StoryCard key={story.id} story={story} now={now} />
        ))}
      </div>
    </div>
  );
}
