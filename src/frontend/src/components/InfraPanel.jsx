import React from 'react';

export default function InfraPanel({ infra, loading, onRefresh }) {
  const web = infra?.web || {};
  const db = infra?.db || {};
  const redis = infra?.redis || {};

  // Compute active containers list
  const containers = [
    {
      id: 'web',
      name: 'Web Service',
      containerName: web.container || 'taskforge-web-1',
      icon: '🌐',
      status: web.container ? 'Running' : 'Offline',
      isOk: Boolean(web.container),
    },
    {
      id: 'db',
      name: 'Database (PostgreSQL)',
      containerName: db.container || 'taskforge-postgres-1',
      icon: '🐘',
      status: db.status === 'connected' ? 'Running' : 'Offline',
      isOk: db.status === 'connected',
    },
    {
      id: 'redis',
      name: 'Cache (Redis)',
      containerName: redis.container || 'taskforge-redis-1',
      icon: '⚡',
      status: redis.status === 'connected' ? 'Running' : 'Offline',
      isOk: redis.status === 'connected',
    },
  ];

  const runningCount = containers.filter((c) => c.isOk).length;

  return (
    <aside className="infra-column" aria-label="Running Containers">
      <div className="infra-header">
        <div>
          <h2>
            <span>📦</span> Running Containers
          </h2>
          <p className="infra-subtitle">
            <span className="running-count-badge">{runningCount} of {containers.length} Active</span>
          </p>
        </div>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh container status"
        >
          {loading ? '↻ ...' : '↻ Refresh'}
        </button>
      </div>

      <div className="container-cards-list">
        {containers.map((c) => (
          <div key={c.id} className="simple-container-card">
            <div className="simple-container-header">
              <div className="simple-container-title">
                <span className="simple-container-icon">{c.icon}</span>
                <span className="simple-service-label">{c.name}</span>
              </div>
              <span className={`status-pill ${c.isOk ? 'pill-running' : 'pill-offline'}`}>
                <span className={`status-dot ${c.isOk ? 'dot-running' : 'dot-offline'}`} />
                {c.status}
              </span>
            </div>

            <div className="container-name-box">
              <span className="container-name-prefix">Container:</span>
              <span className="container-name-text" title={c.containerName}>
                {c.containerName}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
