import { useState, useEffect, useRef, useCallback } from "react";
import CURRICULUM from "./curriculum.json";

const STATUS_CYCLE = ["not-started", "in-progress", "done", "needs-revision"];
const STATUS_CONFIG = {
  "not-started": { label: "Not Started", color: "#374151", bg: "#1f2937", icon: "○" },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "#451a03", icon: "◑" },
  "done": { label: "Done", color: "#10b981", bg: "#052e16", icon: "●" },
  "needs-revision": { label: "Needs Revision", color: "#8b5cf6", bg: "#2e1065", icon: "↺" },
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function mergeRoadmapData(local, remote) {
  const merged = { ...local };
  const statusPrecedence = {
    "done": 3,
    "needs-revision": 2,
    "in-progress": 1,
    "not-started": 0
  };

  Object.keys(remote).forEach(key => {
    if (key.startsWith("status_")) {
      const localVal = local[key] || "not-started";
      const remoteVal = remote[key] || "not-started";
      const localWeight = statusPrecedence[localVal] ?? 0;
      const remoteWeight = statusPrecedence[remoteVal] ?? 0;
      if (remoteWeight > localWeight) {
        merged[key] = remoteVal;
      } else {
        merged[key] = localVal;
      }
    } else if (key.startsWith("time_")) {
      const localVal = Number(local[key]) || 0;
      const remoteVal = Number(remote[key]) || 0;
      merged[key] = Math.max(localVal, remoteVal);
    } else {
      if (local[key] === undefined) {
        merged[key] = remote[key];
      }
    }
  });

  return merged;
}

function useStorage(user) {
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const pendingSyncRef = useRef(null);
  const latestDataRef = useRef(data);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    async function load() {
      let localData = {};
      try {
        if (window.storage && typeof window.storage.get === 'function') {
          const result = await window.storage.get("tracker-data");
          if (result) localData = JSON.parse(result.value);
        } else {
          const result = localStorage.getItem("tracker-data");
          if (result) localData = JSON.parse(result);
        }
      } catch (err) {
        console.error("Failed to load local tracker data:", err);
      }

      // 1. Load local data immediately for zero latency
      setData(localData);
      setLoaded(true);

      // 2. Load and merge remote data from MongoDB asynchronously
      if (user && user.id && user.token) {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
          const response = await fetch(`${API_BASE}/yatra/users/${user.id}/roadmap`, {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          if (response.ok) {
            const remoteData = await response.json();
            if (remoteData && Object.keys(remoteData).length > 0) {
              const mergedData = mergeRoadmapData(localData, remoteData);
              setData(mergedData);
              
              // Sync back to local storage
              if (window.storage && typeof window.storage.set === 'function') {
                await window.storage.set("tracker-data", JSON.stringify(mergedData));
              } else {
                localStorage.setItem("tracker-data", JSON.stringify(mergedData));
              }

              // If merged data differs from remote (e.g. offline progress), write back to database
              if (JSON.stringify(mergedData) !== JSON.stringify(remoteData)) {
                fetch(`${API_BASE}/yatra/users/${user.id}/roadmap`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                  },
                  body: JSON.stringify(mergedData)
                }).catch(err => console.error("Failed background merge sync:", err));
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch remote roadmap data:", err);
        }
      }
    }
    load();
  }, [user]);

  const save = useCallback(async (newData) => {
    // Update state and local storage immediately (zero UI latency)
    setData(newData);
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        await window.storage.set("tracker-data", JSON.stringify(newData));
      } else {
        localStorage.setItem("tracker-data", JSON.stringify(newData));
      }
    } catch (err) {
      console.error("Failed to save tracker local storage:", err);
    }

    // Debounced sync to MongoDB
    if (user && user.id && user.token) {
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
      }
      pendingSyncRef.current = setTimeout(async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
          await fetch(`${API_BASE}/yatra/users/${user.id}/roadmap`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(newData)
          });
          pendingSyncRef.current = null;
        } catch (err) {
          console.error("Failed to sync roadmap progress to backend:", err);
        }
      }, 1500); // 1.5s debounce to optimize database writes
    }
  }, [user]);

  // Flush any pending saves on unmount / component cleanup
  useEffect(() => {
    return () => {
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
        if (user && user.id && user.token) {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
          const payload = latestDataRef.current;
          fetch(`${API_BASE}/yatra/users/${user.id}/roadmap`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(payload)
          }).catch(err => console.error("Failed unmount roadmap sync:", err));
        }
      }
    };
  }, [user]);

  return { data, save, loaded };
}

export default function Tracker({ user }) {
  const { data, save, loaded } = useStorage(user);
  const [activeSection, setActiveSection] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [timerTopicId, setTimerTopicId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [view, setView] = useState("roadmap"); // roadmap | section
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const getStatus = (id) => data[`status_${id}`] || "not-started";
  const getTime = (id) => data[`time_${id}`] || 0;

  const cycleStatus = (id) => {
    const cur = getStatus(id);
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    save({ ...data, [`status_${id}`]: next });
  };

  const startTimer = (id) => {
    if (timerRunning && timerTopicId === id) {
      // stop & save
      const newData = { ...data, [`time_${id}`]: getTime(id) + timerSeconds };
      save(newData);
      setTimerRunning(false);
      setTimerSeconds(0);
      setTimerTopicId(null);
    } else {
      if (timerRunning && timerTopicId) {
        const newData = { ...data, [`time_${timerTopicId}`]: getTime(timerTopicId) + timerSeconds };
        save(newData);
      }
      setTimerSeconds(0);
      setTimerTopicId(id);
      setTimerRunning(true);
    }
  };

  const getSectionProgress = (section) => {
    const all = [];
    section.topics.forEach(t => {
      all.push(t.id);
      t.subtopics.forEach((_, i) => all.push(`${t.id}_sub_${i}`));
    });
    const done = all.filter(id => getStatus(id) === "done").length;
    return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
  };

  const getSectionTime = (section) => {
    let total = 0;
    section.topics.forEach(t => {
      total += getTime(t.id);
      t.subtopics.forEach((_, i) => { total += getTime(`${t.id}_sub_${i}`); });
    });
    return total;
  };

  if (!loaded) {
    return (
      <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: "monospace" }}>
        Loading tracker...
      </div>
    );
  }

  const currentSection = activeSection ? CURRICULUM.find(s => s.id === activeSection) : null;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 14 }}>
      {/* Header */}
      <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        {view === "section" && (
          <button onClick={() => { setView("roadmap"); setActiveSection(null); setExpandedTopic(null); }}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px 8px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
            {view === "section" && currentSection ? `${currentSection.icon} ${currentSection.section}` : "☕ Java Mastery Tracker"}
          </div>
          {view === "roadmap" && (
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
              {CURRICULUM.reduce((a, s) => a + getSectionProgress(s).done, 0)} /{" "}
              {CURRICULUM.reduce((a, s) => a + getSectionProgress(s).total, 0)} items done
            </div>
          )}
        </div>
        {timerRunning && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#f59e0b", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-color)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
            {formatTime(timerSeconds)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg-primary); } ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }
        .topic-row:hover { background: rgba(255,255,255,0.015) !important; }
        .sub-row:hover { background: rgba(255,255,255,0.01) !important; }
        .section-card:hover { border-color: var(--accent-gold) !important; transform: translateY(-1px); }
        .btn-status:hover { filter: brightness(1.2); }
      `}</style>

      {view === "roadmap" && (
        <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            WHY → WHAT → HOW &nbsp;·&nbsp; Feel the pain first &nbsp;·&nbsp; Build intuition, not memory
          </div>

          {/* Overall progress */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>Overall Progress</span>
              <span style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>
                {Math.round(CURRICULUM.reduce((a, s) => a + getSectionProgress(s).pct, 0) / CURRICULUM.length)}%
              </span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                background: "linear-gradient(90deg, #10b981, var(--color-primary, #3b82f6))",
                width: `${Math.round(CURRICULUM.reduce((a, s) => a + getSectionProgress(s).pct, 0) / CURRICULUM.length)}%`,
                transition: "width 0.5s"
              }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ color: v.color }}>{v.icon}</span> {v.label}
                </div>
              ))}
            </div>
          </div>

          {/* Section cards */}
          <div style={{ display: "grid", gap: 14 }}>
            {CURRICULUM.map((section, idx) => {
              const prog = getSectionProgress(section);
              const stime = getSectionTime(section);
              return (
                <div key={section.id} className="section-card"
                  onClick={() => { setActiveSection(section.id); setView("section"); }}
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{section.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", marginRight: 8 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{section.section}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                          {stime > 0 && <span style={{ fontFamily: "monospace" }}>⏱ {formatTime(stime)}</span>}
                          <span style={{ color: section.color, fontWeight: 600 }}>{prog.pct}%</span>
                          <span>{prog.done}/{prog.total}</span>
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 4, marginTop: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: section.color, width: `${prog.pct}%`, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {section.topics.slice(0, 5).map(t => (
                          <span key={t.id} style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 10 }}>
                            {t.title}
                          </span>
                        ))}
                        {section.topics.length > 5 && (
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", padding: "2px 8px" }}>+{section.topics.length - 5} more</span>
                        )}
                      </div>
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 18, marginLeft: 4 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "section" && currentSection && (
        <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
          {/* Section progress bar */}
          {(() => {
            const prog = getSectionProgress(currentSection);
            const stime = getSectionTime(currentSection);
            return (
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <span>{prog.done} of {prog.total} done</span>
                    <span style={{ color: currentSection.color, fontWeight: 600 }}>{prog.pct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: currentSection.color, width: `${prog.pct}%`, transition: "width 0.3s" }} />
                  </div>
                </div>
                {stime > 0 && <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-secondary)" }}>⏱ {formatTime(stime)} total</span>}
              </div>
            );
          })()}

          {/* Topics */}
          <div style={{ display: "grid", gap: 10 }}>
            {currentSection.topics.map((topic) => {
              const isExpanded = expandedTopic === topic.id;
              const status = getStatus(topic.id);
              const sc = STATUS_CONFIG[status];
              const ttime = getTime(topic.id);
              const isActiveTimer = timerTopicId === topic.id && timerRunning;

              return (
                <div key={topic.id} style={{ background: "var(--bg-secondary)", border: `1px solid ${isExpanded ? "var(--border-color)" : "transparent"}`, borderRadius: 10, overflow: "hidden" }}>
                  {/* Topic header row */}
                  <div className="topic-row"
                    style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12, cursor: "pointer", background: "var(--bg-secondary)" }}
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}>

                    {/* Status button */}
                    <button className="btn-status"
                      onClick={e => { e.stopPropagation(); cycleStatus(topic.id); }}
                      style={{
                        background: sc.bg,
                        border: `1px solid ${sc.color}`,
                        color: sc.color,
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                      <span>{sc.icon}</span>
                      <span>{sc.label}</span>
                    </button>

                    {/* Topic Title */}
                    <div style={{ flex: 1, fontWeight: 600 }}>{topic.title}</div>

                    {/* Timer controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                      {ttime > 0 && (
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                          {formatTime(ttime)}
                        </span>
                      )}
                      <button 
                        onClick={() => startTimer(topic.id)}
                        style={{
                          background: isActiveTimer ? "#451a03" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${isActiveTimer ? "#f59e0b" : "var(--border-color)"}`,
                          color: isActiveTimer ? "#f59e0b" : "var(--text-secondary)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "monospace"
                        }}
                      >
                        {isActiveTimer ? "⏹ Stop" : "⏱ Start"}
                      </button>
                    </div>

                    <div style={{ color: "var(--text-secondary)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                      ›
                    </div>
                  </div>

                  {/* Subtopics list */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.15)", padding: "8px 16px" }}>
                      {topic.subtopics.map((subtopic, subIdx) => {
                        const subId = `${topic.id}_sub_${subIdx}`;
                        const subStatus = getStatus(subId);
                        const subConfig = STATUS_CONFIG[subStatus];
                        const subTime = getTime(subId);
                        const isSubActiveTimer = timerTopicId === subId && timerRunning;

                        return (
                          <div key={subIdx} className="sub-row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "8px 0",
                              gap: 12,
                              borderBottom: subIdx < topic.subtopics.length - 1 ? "1px solid var(--border-color)" : "none"
                            }}>
                            {/* Subtopic Status checkbox */}
                            <button className="btn-status"
                              onClick={() => cycleStatus(subId)}
                              style={{
                                background: "none",
                                border: "none",
                                color: subConfig.color,
                                cursor: "pointer",
                                fontSize: 14,
                                padding: 0
                              }}>
                                {subConfig.icon}
                            </button>

                            {/* Subtopic Title */}
                            <div style={{ flex: 1, color: subStatus === "done" ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: subStatus === "done" ? "line-through" : "none", fontSize: 13 }}>
                              {subtopic}
                            </div>

                            {/* Subtopic Timer controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {subTime > 0 && (
                                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                                  {formatTime(subTime)}
                                </span>
                              )}
                              <button 
                                onClick={() => startTimer(subId)}
                                style={{
                                  background: isSubActiveTimer ? "#451a03" : "rgba(0,0,0,0.2)",
                                  border: `1px solid ${isSubActiveTimer ? "#f59e0b" : "var(--border-color)"}`,
                                  color: isSubActiveTimer ? "#f59e0b" : "var(--text-secondary)",
                                  borderRadius: 4,
                                  padding: "2px 6px",
                                  fontSize: 11,
                                  cursor: "pointer",
                                  fontFamily: "monospace"
                                }}
                              >
                                {isSubActiveTimer ? "⏹ Stop" : "⏱ Start"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
