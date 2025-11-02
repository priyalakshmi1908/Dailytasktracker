

import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("tasks_v4");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [dueAtInput, setDueAtInput] = useState("");
  const intervalRef = useRef(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("tasks_v4", JSON.stringify(tasks));
  }, [tasks]);

  // Ask for notification permission once
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // 🕒 Track running tasks every second
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.tracking && !t.completed && t.startTimestamp) {
            const now = Date.now();
            const deltaSec = Math.floor((now - t.startTimestamp) / 1000);
            if (deltaSec > 0) {
              return {
                ...t,
                timeSpentSeconds: (t.timeSpentSeconds || 0) + deltaSec,
                startTimestamp: now,
              };
            }
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // 🔔 Reminder watcher
  useEffect(() => {
    if (!("Notification" in window)) return;
    const checker = setInterval(() => {
      const now = Date.now();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.dueAt && !t.reminded && !t.completed) {
            const dueMs = new Date(t.dueAt).getTime();
            if (!Number.isNaN(dueMs) && now >= dueMs) {
              if (Notification.permission === "granted") {
                new Notification(`⏰ Task Due: ${t.title}`, {
                  body: t.project
                    ? `Project: ${t.project} — due time exceeded`
                    : `Task "${t.title}" is overdue!`,
                  tag: `reminder-${t.id}`,
                  requireInteraction: true,
                });
              } else {
                alert(`⚠️ Reminder: ${t.title} is due now!`);
              }
              return { ...t, reminded: true };
            }
          }
          return t;
        })
      );
    }, 5000);
    return () => clearInterval(checker);
  }, []);

  // ➕ Add Task
  function addTask(e) {
    if (e) e.preventDefault();
    if (!title.trim()) return alert("Please enter a task title");

    const newTask = {
      id: Date.now().toString(),
      title: title.trim(),
      project: project.trim() || null,
      createdAt: new Date().toISOString(),
      dueAt: dueAtInput ? new Date(dueAtInput).toISOString() : null,
      reminded: false,
      completed: false,
      completedAt: null,
      tracking: false,
      startTimestamp: null,
      timeSpentSeconds: 0,
    };

    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setProject("");
    setDueAtInput("");
  }

  // ▶️ Start / Stop Tracking
  function toggleTracking(id) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.completed) return t;
        return t.tracking
          ? { ...t, tracking: false, startTimestamp: null }
          : { ...t, tracking: true, startTimestamp: Date.now() };
      })
    );
  }

  // ✅ Complete / Undo
  function toggleComplete(id) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const completedNow = !t.completed;
        return {
          ...t,
          completed: completedNow,
          tracking: false,
          startTimestamp: null,
          completedAt: completedNow ? new Date().toISOString() : null,
        };
      })
    );

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Task Updated", {
        body: "Task marked complete/undo.",
      });
    }
  }

  // ❌ Delete task
  function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // ⏰ Format time (HH:MM:SS)
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  }

  // 📄 Export CSV (only completed tasks)
  function exportCSV() {
    const completed = tasks.filter((t) => t.completed && t.timeSpentSeconds > 0);
    if (completed.length === 0) {
      alert("No completed tasks to export!");
      return;
    }

    const headers = ["Title", "Project", "Time (HH:MM:SS)", "CreatedAt", "CompletedAt", "DueAt"];
    const rows = completed.map((t) => [
      t.title,
      t.project || "",
      formatTime(t.timeSpentSeconds || 0),
      t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
      t.completedAt ? new Date(t.completedAt).toLocaleString() : "",
      t.dueAt ? new Date(t.dueAt).toLocaleString() : "",
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `timesheet_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  // 🧠 UI
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        background: "#0f172a",
        color: "#e6eef8",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 10 }}>🧠 Daily Task Tracker</h1>

        {/* Add Task */}
        <form
          onSubmit={addTask}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            style={{ padding: 8, borderRadius: 6 }}
          />
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Project (optional)"
            style={{ padding: 8, borderRadius: 6 }}
          />
          <input
            type="datetime-local"
            value={dueAtInput}
            onChange={(e) => setDueAtInput(e.target.value)}
            style={{ padding: 8, borderRadius: 6 }}
          />
          <button
            type="submit"
            style={{
              background: "#2563eb",
              color: "white",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            Add
          </button>
        </form>

        {/* Tasks List */}
        {tasks.map((t) => (
          <div
            key={t.id}
            style={{
              background: t.completed ? "#14532d" : "#1e293b",
              marginBottom: 8,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{t.title}</strong>
                <div style={{ fontSize: 13, color: "#9aa7bf" }}>
                  {t.project && <>{t.project} • </>}
                  ⏱ {formatTime(t.timeSpentSeconds || 0)}
                </div>
                <div style={{ fontSize: 12, color: "#9aa7bf" }}>
                  Created: {new Date(t.createdAt).toLocaleString()}
                  {t.dueAt && ` • Due: ${new Date(t.dueAt).toLocaleString()}`}
                  {t.completedAt && ` • Done: ${new Date(t.completedAt).toLocaleString()}`}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => toggleTracking(t.id)}
                  style={{
                    background: t.tracking ? "#f59e0b" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                  }}
                >
                  {t.tracking ? "Stop" : "Track"}
                </button>
                <button
                  onClick={() => toggleComplete(t.id)}
                  style={{
                    background: t.completed ? "#94a3b8" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                  }}
                >
                  {t.completed ? "Undo" : "Complete"}
                </button>
                <button
                  onClick={() => deleteTask(t.id)}
                  style={{
                    background: "#475569",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 8px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Footer Buttons */}
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button
            onClick={exportCSV}
            style={{
              background: "#7c3aed",
              color: "white",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            ⬇️ Export CSV
          </button>
          <button
            onClick={() => {
              if (window.confirm("Clear all tasks?")) {
                setTasks([]);
                localStorage.removeItem("tasks_v4");
              }
            }}
            style={{
              background: "#ef4444",
              color: "white",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            🧹 Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
