import React, { useState } from "react";

interface ActivityLogsProps {
  logs: string[];
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="activity-drawer">
      <button
        type="button"
        className="activity-drawer-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="activity-toggle-title">
          <span className="status-dot" aria-hidden="true" />
          <span>Consola de actividad ({logs.length} {logs.length === 1 ? "registro" : "registros"})</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="activity-console" role="log" aria-live="polite">
          {logs.length > 0 ? (
            logs.slice(-15).map((entry, index) => (
              <div key={`${entry}-${index}`} className="activity-log-line">
                {entry}
              </div>
            ))
          ) : (
            <div className="activity-log-line">Sin actividad reciente. El sistema está listo.</div>
          )}
        </div>
      )}
    </div>
  );
};

