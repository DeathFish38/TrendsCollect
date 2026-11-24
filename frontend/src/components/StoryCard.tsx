import type { Story } from "../api/types";
import { domainOf, formatUtc, timeAgo } from "../lib/format";

/** One story in the news-platform drill-down feed. */
export default function StoryCard({ story, now }: { story: Story; now: number }) {
  const hnLink = `https://news.ycombinator.com/item?id=${story.id}`;
  const domain = domainOf(story.url);

  return (
    <article className="story">
      <h3 className="story__title">
        <a href={story.url ?? hnLink} target="_blank" rel="noreferrer">
          {story.title}
        </a>
        {domain && <span className="story__domain"> ({domain})</span>}
      </h3>
      <div className="story__meta">
        {story.points} points · {story.numComments} comments
        {story.author && <> · by {story.author}</>} ·{" "}
        <time dateTime={story.createdAt} title={formatUtc(story.createdAt)}>
          {timeAgo(story.createdAt, now)}
        </time>{" "}
        ·{" "}
        <a href={hnLink} target="_blank" rel="noreferrer">
          HN
        </a>
      </div>
    </article>
  );
}
