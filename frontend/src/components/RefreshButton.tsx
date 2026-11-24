import { useRefresh } from "../hooks/useRefresh";
import { useToast } from "./Toast";

export default function RefreshButton() {
  const { refresh, isRefreshing } = useRefresh();
  const toast = useToast();

  const onRefresh = async () => {
    try {
      await refresh();
      toast("Collection complete. Fresh data loaded.");
    } catch {
      toast("Refresh failed. Is the backend running?", "error");
    }
  };

  return (
    <button
      className="btn refresh-button"
      type="button"
      onClick={() => void onRefresh()}
      disabled={isRefreshing}
    >
      <span
        className={`refresh-button__icon${isRefreshing ? " is-spinning" : ""}`}
        aria-hidden="true"
      >
        ↻
      </span>
      {isRefreshing ? "Collecting…" : "Refresh"}
      <span className="sr-only" aria-live="polite">
        {isRefreshing ? "Collecting fresh data." : ""}
      </span>
    </button>
  );
}
