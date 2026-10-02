export default function OpsLoading() {
  return (
    <div
      className="ops-view ops-loading-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading operational data</span>
      <div aria-hidden="true">
        <div className="ops-loading-header">
          <div>
            <span className="ops-loading-line ops-loading-kicker" />
            <span className="ops-loading-line ops-loading-title" />
            <span className="ops-loading-line ops-loading-subtitle" />
            <span className="ops-loading-line ops-loading-timestamp" />
          </div>
          <span className="ops-loading-line ops-loading-action" />
        </div>

        <div className="ops-loading-scope">
          <span className="ops-loading-line" />
          <div>
            <span className="ops-loading-line" />
            <span className="ops-loading-line" />
          </div>
        </div>

        <div className="ops-loading-section">
          <span className="ops-loading-line" />
          <span className="ops-loading-line" />
        </div>
        <div className="ops-loading-metrics">
          {[0, 1, 2, 3].map((item) => (
            <div className="ops-loading-metric" key={item}>
              <span className="ops-loading-line" />
              <span className="ops-loading-line" />
              <span className="ops-loading-line" />
            </div>
          ))}
        </div>

        <div className="ops-loading-section ops-loading-section-secondary">
          <span className="ops-loading-line" />
          <span className="ops-loading-line" />
        </div>
        <div className="ops-loading-ledger">
          <div className="ops-loading-ledger-head">
            <span className="ops-loading-line" />
            <span className="ops-loading-line" />
          </div>
          {[0, 1, 2, 3, 4].map((item) => (
            <div className="ops-loading-ledger-row" key={item}>
              <span className="ops-loading-line" />
              <span className="ops-loading-line" />
              <span className="ops-loading-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
