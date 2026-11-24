import { Link, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import { useHealth } from "./hooks/useHealth";
import DashboardPage from "./pages/DashboardPage";
import TopicDetailPage from "./pages/TopicDetailPage";

export default function App() {
  const health = useHealth();
  const collectorStatus = health.data
    ? health.data.schedulerRunning
      ? "running"
      : "stopped"
    : health.isError
      ? "unavailable"
      : "checking…";

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/topics/:id" element={<TopicDetailPage />} />
          <Route
            path="*"
            element={
              <div className="state">
                Page not found. <Link to="/">Back to the watchlist</Link>.
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        <div>
          TrendsCollect — a personal Hacker News trend watchlist. Data from the{" "}
          <a href="https://hn.algolia.com/api" target="_blank" rel="noreferrer">
            Algolia HN Search API
          </a>
          .
        </div>
        <div className="footer__status">
          collector: {collectorStatus} · {health.data?.topicCount ?? "—"} topics
        </div>
      </footer>
    </div>
  );
}
