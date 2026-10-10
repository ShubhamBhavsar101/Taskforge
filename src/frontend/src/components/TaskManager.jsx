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
    <section className="task-column" aria-label="Task Management Dashboard">
      <div className="task-header">
        <div className="task-header-title">
          <h2>Task Manager</h2>
          <p>Distributed Task Operations backed by PostgreSQL & Redis</p>
        </div>

        <div className="stats-bar">
          <div className="stat-box">
            <div className="stat-box-val">{total}</div>
            <div className="stat-box-label">Total</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-val">{active}</div>
            <div className="stat-box-label">Active</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-val">{done}</div>
            <div className="stat-box-label">Done</div>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <form className="add-task-form" onSubmit={handleSubmit}>
        <div className="task-input-wrapper">
          <input
            type="text"
            className="task-input"
            placeholder="What needs to be done? (e.g., Deploy redis replica)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>
        <select
          className="priority-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          disabled={loading}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium</option>
          <option value="high">High Priority</option>
        </select>
        <button type="submit" className="add-button" disabled={loading || !title.trim()}>
          <span>+</span> Add Task
        </button>
      </form>

      {/* Filters */}
      <div className="filter-tabs">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({total})
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({active})
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({done})
        </button>
      </div>

      {/* Task List */}
      <ul className="task-items-list">
        {filteredTasks.length === 0 ? (
          <li className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>
              {filter === 'completed'
                ? 'No completed tasks yet. Finish a task!'
                : filter === 'active'
                ? 'All caught up! No active tasks.'
                : 'No tasks found. Create your first task above.'}
            </p>
          </li>
        ) : (
          filteredTasks.map((t) => (
            <li
              key={t.id}
              className={`task-card ${t.completed ? 'completed' : ''}`}
            >
              <button
                className="task-checkbox-btn"
                onClick={() => onToggleTask(t.id)}
                title={t.completed ? 'Mark incomplete' : 'Mark completed'}
                aria-label={`Toggle task ${t.title}`}
              >
                {t.completed ? '✓' : ''}
              </button>

              <span className="task-text">{t.title}</span>

              <span className={`priority-tag priority-${t.priority}`}>
                {t.priority}
              </span>

              <button
                className="task-delete-btn"
                onClick={() => onDeleteTask(t.id)}
                title="Delete task"
                aria-label={`Delete task ${t.title}`}
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
