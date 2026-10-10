import React from 'react';

export default function InfraPanel({ infra, loading, onRefresh, routingLogs }) {
  const web = infra?.web || {};
  const db = infra?.db || {};
  const redis = infra?.redis || {};

  return (
    <aside className="infra-column" aria-label="Infrastructure and Container Telemetry">
      <div className="infra-header">
        <div>
          <h2>
            <span>⚡</span> Infra Telemetry
          </h2>
          <p className="infra-subtitle">Real-time Service Container Mapping</p>
        </div>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh infrastructure state"
        >
          {loading ? '↻ ...' : '↻ Refresh'}
        </button>
      </div>

      <div className="service-cards">
        {/* Web Service Card */}
        <div className="service-card">
          <div className="service-card-top">
            <div className="service-name-group">
              <span className="service-icon">🌐</span>
              <span>Web Service</span>
            </div>
            <span className="service-badge badge-ok">Active</span>
          </div>

          <div className="container-tag">
            <span className="container-tag-label">Container</span>
            <span className="container-tag-val" title={web.container || 'local'}>
              {web.container || 'taskforge-web-1'}
            </span>
          </div>

          <div className="service-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Hostname</span>
              <span className="meta-val" title={web.hostname}>{web.hostname || 'localhost'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Process PID</span>
              <span className="meta-val">{web.pid || '-'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Uptime</span>
              <span className="meta-val">{web.uptimeSeconds ? `${web.uptimeSeconds}s` : '-'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Memory RSS</span>
              <span className="meta-val">{web.memoryMb ? `${web.memoryMb} MB` : '-'}</span>
            </div>
          </div>
        </div>

        {/* PostgreSQL Service Card */}
        <div className="service-card">
          <div className="service-card-top">
            <div className="service-name-group">
              <span className="service-icon">🐘</span>
              <span>PostgreSQL DB</span>
            </div>
            <span
              className={`service-badge ${
                db.status === 'connected' ? 'badge-ok' : 'badge-err'
              }`}
            >
              {db.status === 'connected' ? 'Connected' : 'Error'}
            </span>
          </div>

          <div className="container-tag">
            <span className="container-tag-label">Container</span>
            <span className="container-tag-val" title={db.container || 'postgres'}>
              {db.container || 'taskforge-postgres-1'}
            </span>
          </div>

          <div className="service-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Server IP:Port</span>
              <span className="meta-val">
                {db.ip || db.host || 'localhost'}:{db.port || '5432'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Backend PID</span>
              <span className="meta-val">{db.backendPid || '-'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Database</span>
              <span className="meta-val">{db.database || 'taskforge'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Version</span>
              <span className="meta-val">PG {db.version || '16'}</span>
            </div>
          </div>
        </div>

        {/* Redis Cache Card */}
        <div className="service-card">
          <div className="service-card-top">
            <div className="service-name-group">
              <span className="service-icon">⚡</span>
              <span>Redis Cache</span>
            </div>
            <span
              className={`service-badge ${
                redis.status === 'connected' ? 'badge-ok' : 'badge-err'
              }`}
            >
              {redis.status === 'connected' ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="container-tag">
            <span className="container-tag-label">Container</span>
            <span className="container-tag-val" title={redis.container || 'redis'}>
              {redis.container || 'taskforge-redis-1'}
            </span>
          </div>

          <div className="service-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Host:Port</span>
              <span className="meta-val">
                {redis.host || 'localhost'}:{redis.port || '6379'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Instance Run ID</span>
              <span className="meta-val" title={redis.runId || 'N/A'}>
                {redis.shortRunId ? `#${redis.shortRunId}` : 'N/A'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Version</span>
              <span className="meta-val">v{redis.version || '7.x'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">TTL Cache</span>
              <span className="meta-val">30s Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Request Routing Stream */}
      <div className="routing-stream-section">
        <div className="routing-stream-title">
          <span>Active Request Container Route</span>
          <span className="routing-stream-badge">Live Trace</span>
        </div>

        <div className="routing-feed">
          {routingLogs && routingLogs.length > 0 ? (
            routingLogs.map((log) => (
              <div key={log.id} className="route-trace-card">
                <div className="route-trace-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`method-tag method-${log.method}`}>
                      {log.method}
                    </span>
                    <span className="route-action-name">{log.action}</span>
                  </div>
                  <span className="route-duration">{log.duration || 'ok'}</span>
                </div>

                <div className="route-path-flow">
                  <span className="flow-node" title="Web container replica">
                    Web: {log.webContainer}
                  </span>
                  <span className="flow-arrow">➔</span>
                  <span className="flow-node" title="PostgreSQL container">
                    DB: {log.dbContainer}
                  </span>
                  <span className="flow-arrow">➔</span>
                  <span className="flow-node" title="Redis container / Cache">
                    Redis: {log.redisContainer} {log.cacheHit ? `(${log.cacheHit})` : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textAlign: 'center', padding: '10px 0' }}>
              Interact with tasks to see live container routing
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
