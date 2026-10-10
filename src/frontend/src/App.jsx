import React, { useState, useEffect, useCallback } from 'react';
import TaskManager from './components/TaskManager';
import Footer from './components/Footer';

const API_BASE = '/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [healthStatus, setHealthStatus] = useState('ok');
  const [loading, setLoading] = useState(false);

  // Fetch tasks
  const fetchTasks = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`${API_BASE}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Health check
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setHealthStatus(data.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealthStatus('error');
    }
  }, []);

  // Add task
  const handleAddTask = async (title, priority) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  // Toggle task
  const handleToggleTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  useEffect(() => {
    fetchTasks(true);
    checkHealth();

    const healthInterval = setInterval(checkHealth, 30000);
    return () => clearInterval(healthInterval);
  }, [fetchTasks, checkHealth]);

  return (
    <>
      <header className="forge-header">
        <div className="forge-header-inner">
          <div className="brand-stamp">
            <div className="stamp-mark">TF</div>
            <h1 className="brand-title">TaskForge</h1>
          </div>

          <div className="header-status">
            <div
              className={`status-beacon ${healthStatus === 'ok' ? '' : 'error'}`}
            />
            <span>
              {healthStatus === 'ok' ? 'Cluster Active' : 'Cluster Offline'}
            </span>
          </div>
        </div>
      </header>

      <main className="forge-workspace">
        <TaskManager
          tasks={tasks}
          loading={loading}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
        />
      </main>

      <Footer />
    </>
  );
}
