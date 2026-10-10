import React, { useState } from 'react';

export default function TaskManager({
  tasks,
  loading,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('all');

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const active = total - done;
  const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTask(trimmed, priority);
    setTitle('');
  };

  return (
    <section className="workbench-card" aria-label="Task Ledger">
      {/* Workbench Header & Progress */}
      <div className="workbench-header">
        <div className="workbench-titles">
          <h2>Task Ledger</h2>
          <p>Local state synced with PostgreSQL and Redis</p>
        </div>

        <div className="completion-counter">
          <div className="counter-value">
            {done} / {total}
          </div>
          <div className="counter-label">
            {percentComplete}% Completed
          </div>
        </div>
      </div>

      {/* Progress Rail */}
      <div className="progress-rail" role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="progress-fill"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* Task Creation Form */}
      <form className="task-creator-form" onSubmit={handleSubmit}>
        <div className="input-row">
          <input
            type="text"
            className="task-text-input"
            placeholder="Record new task or work item..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="forge-btn"
            disabled={loading || !title.trim()}
          >
            Forge Task
          </button>
        </div>

        {/* Segmented Priority Control */}
        <div className="controls-bar">
          <div className="segmented-group" role="group" aria-label="Select Priority">
            <span className="segmented-label">Priority:</span>
            <button
              type="button"
              className={`segmented-btn ${priority === 'low' ? 'active priority-low' : ''}`}
              onClick={() => setPriority('low')}
            >
              Low
            </button>
            <button
              type="button"
              className={`segmented-btn ${priority === 'medium' ? 'active priority-medium' : ''}`}
              onClick={() => setPriority('medium')}
            >
              Medium
            </button>
            <button
              type="button"
              className={`segmented-btn ${priority === 'high' ? 'active priority-high' : ''}`}
              onClick={() => setPriority('high')}
            >
              High
            </button>
          </div>
        </div>
      </form>

      {/* Filter Strip */}
      <div className="filter-strip" role="tablist" aria-label="Filter tasks">
        <button
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({total})
        </button>
        <button
          className={`filter-chip ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({active})
        </button>
        <button
          className={`filter-chip ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({done})
        </button>
      </div>

      {/* Work Orders List */}
      <ul className="work-orders-list">
        {filteredTasks.length === 0 ? (
          <li className="workbench-empty">
            <div className="empty-stamp">⚒</div>
            <p className="empty-text">
              {filter === 'completed'
                ? 'No completed tasks in ledger.'
                : filter === 'active'
                ? 'All active tasks cleared.'
                : 'Workbench is clear. Enter a task above to forge.'}
            </p>
          </li>
        ) : (
          filteredTasks.map((t) => (
            <li
              key={t.id}
              className={`work-order-card priority-edge-${t.priority} ${
                t.completed ? 'settled' : ''
              }`}
            >
              <button
                className="tactile-check"
                onClick={() => onToggleTask(t.id)}
                title={t.completed ? 'Mark incomplete' : 'Mark completed'}
                aria-label={`Mark task ${t.title} as ${t.completed ? 'incomplete' : 'complete'}`}
              >
                {t.completed ? '✓' : ''}
              </button>

              <span className="order-title">{t.title}</span>

              <span className={`priority-chip chip-${t.priority}`}>
                {t.priority}
              </span>

              <button
                className="order-remove-btn"
                onClick={() => onDeleteTask(t.id)}
                title="Remove task"
                aria-label={`Delete task ${t.title}`}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
