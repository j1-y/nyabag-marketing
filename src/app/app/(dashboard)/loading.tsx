import { BookmarksIcon } from "@phosphor-icons/react/dist/ssr";

export default function DashboardLoading() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <span className="topbar-kicker">Dashboard</span>
          <h1>Bookmarks</h1>
        </div>
      </div>
      <section className="dashboard-greeting dashboard-enter" aria-label="Dashboard loading">
        <h1>Loading your board...</h1>
        <div className="dashboard-greeting-actions">
          <button type="button" className="dashboard-new-bookmark-btn" disabled>
            <span className="dashboard-new-bookmark-inner">New bookmark</span>
          </button>
        </div>
      </section>
      <div className="empty-state dashboard-enter dashboard-enter-delayed" role="status" aria-live="polite">
        <div className="empty-state-icon" aria-hidden="true">
          <BookmarksIcon size={24} weight="duotone" />
        </div>
        <h2>Loading bookmarks</h2>
        <p>Getting your visual memory ready.</p>
      </div>
    </>
  );
}
