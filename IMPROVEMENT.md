# TrendsCollect — Frontend UX/UI Improvement Plan

Frontend-only. Keep the original style: white paper, black ink, hairline borders,
serif headlines + monospace tabular data, no shadows/gradients, green/red only for
direction. No new dependencies — everything hand-rolled. No backend changes.
PLAN.md is not modified.

## P0 — Feedback & state visibility
1. Refresh button spinner — animate ↻ while refreshing; aria-live status
   ("Collecting…/Done"). RefreshButton.tsx, index.css
2. Toast notifications — minimal ink-bordered, bottom-center, mono, auto-dismiss;
   for add/rename/pause/delete/refresh outcomes. New components/Toast.tsx + store;
   wire into AddTopicForm, TopicDetailPage, RefreshButton
3. Live relative timestamps — useNow(30s) tick so "3 min ago" stays truthful.
   New hooks/useNow.ts; used in TopicRow, StoryCard, TopicDetailPage
4. Retry buttons on errors — dashboard error row + detail error/story states call
   refetch(). TopicTable.tsx, TopicDetailPage.tsx
5. Detail-page skeletons — replace "Loading…" text with pulsing chart placeholder +
   3 skeleton story cards (reuse .skel). TopicDetailPage.tsx, StoryList.tsx, index.css
6. Micro-transitions & press states — 120ms ease on hover/active for .btn,
   .topic-row, .segmented, story links; honor prefers-reduced-motion. index.css

## P1 — Watchlist & detail upgrades
7. Sortable columns — Score / 24h % / Volume / Last Updated; ▲▼ indicators;
   persist in localStorage. TopicTable.tsx, index.css
8. Market summary strip — mono line: "12 topics · 8▲ 3▼ 1— · top mover RUST +12.4%".
   DashboardPage.tsx, index.css
9. Empty-state starter chips — ~6 clickable keywords calling the existing create
   mutation. TopicTable.tsx / AddTopicForm.tsx
10. Styled delete confirmation — replace window.confirm with on-brand modal (serif
    title, mono warning, Esc/backdrop cancel, focus-trap). New components/ConfirmDialog.tsx
11. Story feed sorting — Newest / Points / Comments toggle + count. StoryList.tsx,
    TopicDetailPage.tsx
12. URL-synced chart window — ?window=24h|7d|30d via search params. TopicDetailPage.tsx
13. Footer collector status — poll GET /api/health every 60s → "collector: running ·
    N topics". New hooks/useHealth.ts, App.tsx
14. Absolute-time tooltips — title attrs on every "x min ago". TopicRow, StoryCard, detail

## P2 — Accessibility & navigation polish
15. Keyboard-accessible rows — row onKeyDown (Enter navigates); hover/focus-revealed
    quick actions (pause/delete). TopicRow.tsx
16. Skip link + aria-live regions for refresh/toast/loading. App.tsx, index.css
17. Scroll-to-top on route change + per-route document.title. New ScrollToTop.tsx /
    useDocumentTitle.ts, App.tsx, pages
18. Changed-value flash — subtle #f7f7f7 pulse on score/% cells that changed after a
    poll (monochrome). TopicRow.tsx, index.css
19. Mobile tuning — <640px tighter padding, hide keyword sub-line, stack manage
    controls; keep horizontal scroll. index.css
20. Chart polish — flat 6%-opacity ink area fill under line, y-domain from 0. ScoreChart.tsx

## Verification
- npm run typecheck and npm run build clean
- Manual walkthrough: dashboard + detail with backend stopped (error/retry) and
  running (toasts, sorting, modals, footer health, quick actions)
