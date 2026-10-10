import React, { useState, useEffect, useCallback } from 'react';
import InfraPanel from './components/InfraPanel';
import TaskManager from './components/TaskManager';
import Footer from './components/Footer';

const API_BASE = '/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [infra, setInfra] = useState(null);
  const [healthStatus, setHealthStatus] = useState('ok');
  const [loading, setLoading] = useState(false);
  const [infraLoading, setInfraLoading] = useState(false);
  const [routingLogs, setRoutingLogs] = useState([]);

  // Record a trace log from response headers
  const recordTrace = useCallback((action, method, res, startTime) => {
    const elapsed = Date.now() - startTime;
    const webContainer = res.headers.get('X-Served-By-Web') || 'taskforge-web-1';
    const dbContainer = res.headers.get('X-Served-By-DB') || 'taskforge-postgres-1';
    const redisContainer = res.headers.get('X-Served-By-Redis') || 'taskforge-redis-1';
    const cacheHit = res.headers.get('X-Cache');
    const respTime = res.headers.get('X-Response-Time') || `${elapsed}ms`;

    const newLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      method,
      webContainer,
      dbContainer,
      redisContainer,
      cacheHit,
      duration: respTime,
      timestamp: new Date().toLocaleTimeString(),
    };

    setRoutingLogs((prev) => [newLog, ...prev.slice(0, 7)]);
  }, []);

  // Fetch infra details
  const fetchInfra = useCallback(async () => {
    try {
      setInfraLoading(true);
      const res = await fetch(`${API_BASE}/infra`);
      if (res.ok) {
        const data = await res.json();
        setInfra(data);
      }
    } catch (err) {
      console.error('Failed to fetch infra details:', err);
    } finally {
      setInfraLoading(false);
    }
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async (isInitial = false) => {
    const start = Date.now();
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`${API_BASE}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        recordTrace('Fetch Tasks', 'GET', res, start);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [recordTrace]);

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
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority }),
      });
      if (res.ok) {
        recordTrace('Create Task', 'POST', res, start);
        await fetchTasks();
        await fetchInfra();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  // Toggle task
  const handleToggleTask = async (id) => {
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        recordTrace(`Toggle #${id}`, 'PATCH', res, start);
        await fetchTasks();
        await fetchInfra();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        recordTrace(`Delete #${id}`, 'DELETE', res, start);
        await fetchTasks();
        await fetchInfra();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  useEffect(() => {
    fetchTasks(true);
    fetchInfra();
    checkHealth();

    const infraInterval = setInterval(fetchInfra, 8000);
    const healthInterval = setInterval(checkHealth, 30000);

    return () => {
      clearInterval(infraInterval);
      clearInterval(healthInterval);
    };
  }, [fetchTasks, fetchInfra, checkHealth]);

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-group">
            <div className="logo-badge">TF</div>
            <h1 className="brand-title">
              Task<span>Forge</span>
            </h1>
          </div>

          <div className="header-status-pill">
            <div
              className={`live-pulse ${healthStatus === 'ok' ? '' : 'error'}`}
            />
            <span>
              {healthStatus === 'ok' ? 'Cluster Healthy' : 'Degraded Cluster'}
            </span>
          </div>
        </div>
      </header>

      <main className="app-container">
        {/* Left Column: Infrastructure and Container Details */}
        <InfraPanel
          infra={infra}
          loading={infraLoading}
          onRefresh={fetchInfra}
          routingLogs={routingLogs}
        />

        {/* Right Column: Task Management App */}
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
