import RefreshButton from "./RefreshButton";

/** Masthead — app name, tagline, and the global refresh control. */
export default function Header() {
  return (
    <header className="masthead">
      <div>
        <h1 className="masthead__name">TrendsCollect</h1>
        <p className="masthead__tagline">Hacker News topics, tracked like tickers.</p>
      </div>
      <RefreshButton />
    </header>
  );
}
