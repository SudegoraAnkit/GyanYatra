import { useState, useEffect } from "react";
import { Play, Clock, Send, Loader, ExternalLink, Sparkles, ChevronDown, ChevronRight, Menu, BookOpen } from "lucide-react";

export default function YatraTracker({ yatra, user, onUpdate, onBack, onRecordStudy, roadmapData, isSaving }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isMeditating, setIsMeditating] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [simulateMeditation, setSimulateMeditation] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState(["", "", ""]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("sadhana"); // "sadhana" or "chat"
  
  // Responsive / View layout states
  const [isVistaraMode, setIsVistaraMode] = useState(false);
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("video"); // "video", "notes", "acharya"

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

  // Keep selectedTopic in sync with the latest data from the yatra prop
  useEffect(() => {
    if (selectedTopic) {
      const findTopic = (list, id) => {
        for (let item of list) {
          if (item.id === id) return item;
          if (item.subtopics && item.subtopics.length > 0) {
            const found = findTopic(item.subtopics, id);
            if (found) return found;
          }
        }
        return null;
      };
      const latest = findTopic(yatra.topics || [], selectedTopic.id);
      if (latest) {
        setSelectedTopic(latest);
      }
    }
  }, [yatra, selectedTopic?.id]);

  // Auto-select first topic on load
  useEffect(() => {
    if (!selectedTopic && yatra.topics && yatra.topics.length > 0) {
      selectTopic(yatra.topics[0]);
    }
  }, [yatra.topics, selectedTopic]);

  // Toggle Collapse
  const toggleCollapse = (id) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      const id = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
      setTimerIntervalId(id);
    } else {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
    }
    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
    };
  }, [timerRunning]);

  // Handle topic selection change
  const selectTopic = (topic) => {
    if (timerRunning) {
      saveTimeSpent(selectedTopic.id, timerSeconds);
      setTimerRunning(false);
      setTimerSeconds(0);
    }
    setSelectedTopic(topic);
    setVideoUrlInput(topic.videoUrl || "");
    setNotesInput(topic.userNotes || "");
    setChatHistory([]);
    setQuizAnswers(["", "", ""]);
    setQuizSubmitted(false);
    setActiveTab("sadhana");
  };

  const saveTimeSpent = (topicId, seconds) => {
    const updateTree = (list) => {
      return list.map(item => {
        if (item.id === topicId) {
          return { ...item, timeSpent: (item.timeSpent || 0) + seconds };
        }
        if (item.subtopics && item.subtopics.length > 0) {
          return { ...item, subtopics: updateTree(item.subtopics) };
        }
        return item;
      });
    };
    const updatedYatra = { ...yatra, topics: updateTree(yatra.topics) };
    onUpdate(updatedYatra);

    if (onRecordStudy) {
      const findStatus = (list) => {
        for (let item of list) {
          if (item.id === topicId) return item.status || "not-started";
          if (item.subtopics && item.subtopics.length > 0) {
            const s = findStatus(item.subtopics);
            if (s) return s;
          }
        }
        return null;
      };
      const topicStatus = findStatus(yatra.topics) || "not-started";
      onRecordStudy(topicId, topicStatus, seconds);
    }
  };

  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStatusConfig = (status) => {
    const config = {
      "not-started": { label: "Not Started", color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "○" },
      "in-progress": { label: "In Progress", color: "#10b981", bg: "rgba(16,185,129,0.15)", icon: "◑" },
      "done": { label: "Done", color: "#10b981", bg: "rgba(16,185,129,0.15)", icon: "●" },
      "needs-revision": { label: "Revision", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", icon: "↺" }
    };
    return config[status] || config["not-started"];
  };

  const renderStatusCircle = (status, color) => {
    switch (status) {
      case "done":
        return (
          <span className="status-circle done" style={{ display: "inline-flex", width: 14, height: 14, borderRadius: "50%", background: color, border: `1.5px solid ${color}`, position: "relative" }}>
            <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />
          </span>
        );
      case "in-progress":
        return (
          <span className="status-circle in-progress" style={{ display: "inline-flex", width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${color}`, borderTopColor: "transparent" }} />
        );
      case "needs-revision":
        return (
          <span className="status-circle needs-revision" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${color}` }}>
            <span style={{ fontSize: 9, fontWeight: "bold", color, lineHeight: 1 }}>↺</span>
          </span>
        );
      case "not-started":
      default:
        return (
          <span className="status-circle not-started" style={{ display: "inline-flex", width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${color}` }} />
        );
    }
  };

  const cycleStatus = (topicId) => {
    const statusCycle = ["not-started", "in-progress", "done", "needs-revision"];
    let nextStatus = "not-started";
    const updateTree = (list) => {
      return list.map(item => {
        if (item.id === topicId) {
          const curIdx = statusCycle.indexOf(item.status || "not-started");
          nextStatus = statusCycle[(curIdx + 1) % statusCycle.length];
          return { ...item, status: nextStatus };
        }
        if (item.subtopics && item.subtopics.length > 0) {
          return { ...item, subtopics: updateTree(item.subtopics) };
        }
        return item;
      });
    };
    const updatedYatra = { ...yatra, topics: updateTree(yatra.topics) };
    onUpdate(updatedYatra);

    if (onRecordStudy) {
      onRecordStudy(topicId, nextStatus, 0);
    }

    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic(prev => ({ ...prev, status: nextStatus }));
    }
  };

  const discoverVideoTitle = async () => {
    if (!videoUrlInput) return;
    setIsDiscovering(true);
    try {
      const res = await fetch(`${API_BASE}/yatras/discover-topic`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "Authorization": `Bearer ${user.token}`
        },
        body: videoUrlInput
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          updateTopicField(selectedTopic.id, { title: data.title });
          setSelectedTopic(prev => ({ ...prev, title: data.title }));
        }
      }
    } catch (e) {
      console.error("Video discovery failed:", e);
    } finally {
      setIsDiscovering(false);
    }
  };

  const updateTopicField = (topicId, fields) => {
    const updateTree = (list) => {
      return list.map(item => {
        if (item.id === topicId) {
          return { ...item, ...fields };
        }
        if (item.subtopics && item.subtopics.length > 0) {
          return { ...item, subtopics: updateTree(item.subtopics) };
        }
        return item;
      });
    };
    const updatedYatra = { ...yatra, topics: updateTree(yatra.topics) };
    onUpdate(updatedYatra);
  };

  // Keystroke Real-Time Auto-Save Triggers
  const handleUrlChange = (val) => {
    setVideoUrlInput(val);
    updateTopicField(selectedTopic.id, { videoUrl: val });
  };

  const handleNotesChange = (val) => {
    setNotesInput(val);
    updateTopicField(selectedTopic.id, { userNotes: val });
  };

  const submitForMeditation = async () => {
    if (!notesInput.trim()) {
      alert("Please record some Sadhana notes before invoking the Acharya.");
      return;
    }
    setIsMeditating(true);
    try {
      const persona = user.acharyaPersona || "dronacharya";
      const res = await fetch(`${API_BASE}/yatras/${yatra.id}/topics/${selectedTopic.id}/meditate?persona=${persona}&simulate=${simulateMeditation}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated, false, true); // Update local state, skip redundant DB PUT sync
        alert("Acharya review completed successfully!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMeditating(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    const currentMsg = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: currentMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/yatras/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({
          persona: user.acharyaPersona || "dronacharya",
          topicTitle: selectedTopic.title,
          notes: notesInput,
          videoMetadata: `URL: ${videoUrlInput}`,
          history: chatHistory,
          message: currentMsg
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "My meditation is cloudy. Ask again, Seeker." }]);
      }
    } catch (e) {
      console.error("Tutor chat failed:", e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (quizAnswers.some(a => !a.trim())) {
      alert("Please attempt all questions to absorb the knowledge fully.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/yatras/award-karma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ points: 15 })
      });
      if (res.ok) {
        setQuizSubmitted(true);
        if (onRecordStudy) {
          onRecordStudy(selectedTopic.id, selectedTopic.status || "done", 0, true);
        }
        alert("Dhanyavaad! You are awarded +15 Karma points!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTimerToggle = () => {
    if (timerRunning) {
      saveTimeSpent(selectedTopic.id, timerSeconds);
      setTimerRunning(false);
      setTimerSeconds(0);
    } else {
      setTimerRunning(true);
    }
  };

  const getProgressStats = () => {
    let totalItems = 0;
    let completedItems = 0;
    let totalTime = 0;
    let targetTime = 0;

    const traverse = (list) => {
      if (!list) return;
      list.forEach(item => {
        totalItems++;
        if (item.status === "done") completedItems++;
        totalTime += (item.timeSpent || 0);
        targetTime += (item.targetTime || 0);
        if (item.subtopics && item.subtopics.length > 0) {
          traverse(item.subtopics);
        }
      });
    };
    traverse(yatra.topics);

    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { totalItems, completedItems, totalTime, targetTime, pct };
  };

  const stats = getProgressStats();
  const videoId = selectedTopic ? getYoutubeVideoId(videoUrlInput) : null;

  // Safe Tree Rendering Architecture with Correct Green Highlights
  const YatraTreeNode = ({ node, depth = 0 }) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.subtopics && node.subtopics.length > 0;
    const statusCfg = getStatusConfig(node.status);
    const isSelected = selectedTopic && selectedTopic.id === node.id;

    const displayTitle = typeof node.title === "object" && node.title !== null 
      ? (node.title.title || "Untitled Subtopic") 
      : (node.title || "Untitled Topic");

    return (
      <div style={{ 
        marginLeft: depth > 0 ? "20px" : "0", 
        borderLeft: depth > 0 ? "2px dashed rgba(255, 255, 255, 0.15)" : "none", 
        paddingLeft: depth > 0 ? "14px" : "0",
        marginTop: "4px"
      }}>
        <div style={{ 
          display: "flex", gap: "10px", alignItems: "center", padding: "10px 12px", 
          borderRadius: "6px", background: isSelected ? "rgba(16, 185, 129, 0.12)" : "transparent", 
          border: isSelected ? "1px solid #10b981" : "1px solid transparent", cursor: "pointer"
        }}>
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}>
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : <div style={{ width: 14 }} />}

          <button onClick={(e) => { e.stopPropagation(); cycleStatus(node.id); }} style={{ background: "none", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
            {renderStatusCircle(node.status, statusCfg.color)}
          </button>

          <div onClick={() => selectTopic(node)} style={{ flex: 1, fontSize: 13, color: isSelected ? "#ffffff" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayTitle}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div style={{ marginTop: "4px", marginBottom: "6px" }}>
            {node.subtopics.map((child, idx) => {
              const subNode = typeof child === "object" && child !== null
                ? {
                    id: child.id || `${node.id}_sub_${idx}`,
                    title: child.title || "Untitled Subtopic",
                    status: child.status || "not-started",
                    subtopics: child.subtopics || [],
                    videoUrl: child.videoUrl || "",
                    userNotes: child.userNotes || ""
                  }
                : {
                    id: `${node.id}_sub_${idx}`,
                    title: child,
                    status: "not-started",
                    subtopics: [],
                    videoUrl: "",
                    userNotes: ""
                  };

              return (
                <YatraTreeNode key={subNode.id} node={subNode} depth={depth + 1} />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Isolated Textarea Module
  const renderNotesContainer = (isTall) => (
    <div className={`yatra-notes-container-block ${isTall ? "tall" : ""}`}>
      <div className="yatra-notes-header">
        <label className="yatra-notes-label">Sadhana Reflection Notes</label>
        <span className={`yatra-notes-autosave-indicator ${isSaving ? "saving" : "saved"}`}>
          {isSaving ? "Saving changes..." : "All changes saved"}
        </span>
      </div>
      <textarea
        placeholder="Type continuous reflection summaries here..."
        value={notesInput}
        onChange={(e) => handleNotesChange(e.target.value)}
        className="yatra-notes-textarea"
      />
    </div>
  );

  return (
    <div className={`yatra-tracker-container ${isTreeExpanded ? "tree-expanded" : ""} mobile-view-${activeMobileTab}`}>
      
      {/* Overlay Backdrop for Mobile Drawer */}
      {isTreeExpanded && (
        <div className="yatra-drawer-backdrop" onClick={() => setIsTreeExpanded(false)} />
      )}

      {/* LEFT NAVIGATION TREE PANE (COLLAPSIBLE / RESPONSIVE) */}
      <div className={`yatra-tracker-sidebar-pane ${isTreeExpanded ? "expanded" : ""}`}>
        <div className="yatra-sidebar-header">
          <button onClick={() => { if (timerRunning) { saveTimeSpent(selectedTopic.id, timerSeconds); } onBack(); }} className="yatra-back-button">
            ← Gallery Index
          </button>
          <h3 className="yatra-sidebar-title">{yatra.title}</h3>
        </div>

        <div className="yatra-sidebar-tree-container">
          <span className="yatra-sidebar-legend">
            💡 Cycle completion: Click the circle icon symbols (○/●) inside the directory layout tree.
          </span>
          {yatra.topics?.map(topic => (
            <YatraTreeNode key={topic.id} node={topic} />
          ))}
        </div>
      </div>

      {/* RIGHT WORKSPACE CONTEXT ENGINE */}
      <div className="yatra-tracker-workspace-pane">
        {selectedTopic ? (
          <div className="yatra-tracker-active-workspace">
            
            {/* Header Toolbar controls */}
            <div className="yatra-workspace-header">
              <div className="yatra-header-left">
                <button 
                  onClick={() => setIsTreeExpanded(!isTreeExpanded)} 
                  className="yatra-menu-toggle-button"
                  title="Toggle Directory Menu"
                >
                  <Menu size={18} />
                </button>
                <h2 className="yatra-workspace-title">{selectedTopic.title || "Selected Lesson"}</h2>
              </div>

              <div className="yatra-header-controls">
                <button
                  onClick={() => setIsVistaraMode(!isVistaraMode)}
                  className={`yatra-layout-mode-button ${isVistaraMode ? "active" : ""}`}
                >
                  {isVistaraMode ? "Standard Split View" : "Wide Theater View"}
                </button>
                <div className="yatra-study-timer-display">
                  ⏱ {formatDuration(timerSeconds || selectedTopic.timeSpent || 0)}
                </div>
                <button
                  onClick={handleTimerToggle}
                  className={`yatra-study-timer-button ${timerRunning ? "running" : ""}`}
                >
                  {timerRunning ? "Stop" : "Study"}
                </button>
              </div>
            </div>

            {/* Mobile Workspace Segmented Tab Deck Controls */}
            <div className="yatra-mobile-tabs-bar">
              <button 
                onClick={() => { setActiveMobileTab("video"); setIsTreeExpanded(false); }} 
                className={`yatra-mobile-tab-btn ${activeMobileTab === "video" ? "active" : ""}`}
              >
                📺 Study Resource
              </button>
              <button 
                onClick={() => { setActiveMobileTab("notes"); setIsTreeExpanded(false); }} 
                className={`yatra-mobile-tab-btn ${activeMobileTab === "notes" ? "active" : ""}`}
              >
                📝 Reflection Notes
              </button>
              <button 
                onClick={() => { setActiveMobileTab("acharya"); setIsTreeExpanded(false); }} 
                className={`yatra-mobile-tab-btn ${activeMobileTab === "acharya" ? "active" : ""}`}
              >
                🧘 Acharya Review
              </button>
            </div>

            {/* SPLIT COLUMN VIEW GRID */}
            <div className={`yatra-sadhana-workspace ${isVistaraMode ? "workspace-vistara" : "workspace-ekagrata"}`}>
              
              {/* MEDIA DECK GRID CONTAINER */}
              <div className="yatra-sadhana-media-pane">
                
                <div className="yatra-video-wrapper">
                  {videoId ? (
                    <div className="yatra-video-container">
                      <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`} title={selectedTopic.title} frameBorder="0" allowFullScreen />
                    </div>
                  ) : videoUrlInput && videoUrlInput.startsWith("http") ? (
                    <div className="yatra-resource-banner">
                      <ExternalLink size={36} className="resource-icon" style={{ color: "#10b981" }} />
                      <span className="resource-title">Linked Reference Resource:</span>
                      <p className="resource-url">{videoUrlInput}</p>
                      <a href={videoUrlInput} target="_blank" rel="noopener noreferrer" className="btn btn-gold yatra-resource-link">
                        Open Study Resource Web Link ↗
                      </a>
                    </div>
                  ) : (
                    <div className="yatra-video-placeholder">
                      <Play size={24} /> 
                      <span className="placeholder-text">Paste YouTube link or reference Web address down below to begin study.</span>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Paste YouTube Link or Documentation URL here..."
                  value={videoUrlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="yatra-video-input"
                />

                {/* Show Notes underneath player ONLY during normal layout */}
                {!isVistaraMode && renderNotesContainer(false)}
              </div>

              {/* INTEGRATED INTERACTIVE SIDEBAR WRAPPER CONTAINER */}
              <div className="yatra-sadhana-acharya-pane">
                
                {/* Dynamically push Notes to the top of the Sidebar when wide view is activated */}
                {isVistaraMode && renderNotesContainer(true)}

                {/* AI Acharya tab section layout */}
                <div className="yatra-acharya-panel">
                  <div className="yatra-acharya-tabs-header">
                    <button onClick={() => setActiveTab("sadhana")} className={`yatra-acharya-tab-btn ${activeTab === "sadhana" ? "active" : ""}`}>🧘 Acharya Review</button>
                    <button onClick={() => setActiveTab("chat")} className={`yatra-acharya-tab-btn ${activeTab === "chat" ? "active" : ""}`}>💬 Doubt Chat</button>
                  </div>

                  <div className="yatra-acharya-body">
                    {activeTab === "sadhana" && (
                      <div className="yatra-acharya-sadhana-review" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {selectedTopic.aiAnalysis ? (
                          <div className="yatra-ai-review-content" style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
                            {/* Mastery Score Badge */}
                            <div className="insight-score-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", marginBottom: 16 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Sadhana Mastery Score</span>
                              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-gold)" }}>{selectedTopic.aiAnalysis.score} / 100</span>
                            </div>

                            {/* Acharya Guidance */}
                            <div className="insight-section" style={{ marginBottom: 16 }}>
                              <span className="insight-section-title" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--accent-gold)", marginBottom: 6 }}>Acharya Guidance</span>
                              <p className="insight-feedback" style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 6, margin: 0 }}>
                                {selectedTopic.aiAnalysis.feedback}
                              </p>
                            </div>

                            {/* Grasped Concepts */}
                            {selectedTopic.aiAnalysis.identifiedConcepts && selectedTopic.aiAnalysis.identifiedConcepts.length > 0 && (
                              <div className="insight-section" style={{ marginBottom: 16 }}>
                                <span className="insight-section-title" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--accent-gold)", marginBottom: 6 }}>Grasped Concepts</span>
                                <div className="concepts-list" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {selectedTopic.aiAnalysis.identifiedConcepts.map((concept, i) => (
                                    <span key={i} className="concept-tag" style={{ fontSize: 11, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "2px 8px", borderRadius: 10 }}>{concept}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Gap Analysis */}
                            {selectedTopic.aiAnalysis.gapSuggestions && selectedTopic.aiAnalysis.gapSuggestions.length > 0 && (
                              <div className="insight-section" style={{ marginBottom: 16 }}>
                                <span className="insight-section-title" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--accent-gold)", marginBottom: 6 }}>Gap Analysis</span>
                                <ul className="gaps-list" style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                                  {selectedTopic.aiAnalysis.gapSuggestions.map((gap, i) => (
                                    <li key={i} className="gap-item" style={{ marginBottom: 4 }}>{gap}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Recommended Trials */}
                            {selectedTopic.aiAnalysis.relevantTrials && selectedTopic.aiAnalysis.relevantTrials.length > 0 && (
                              <div className="insight-section" style={{ marginBottom: 20 }}>
                                <span className="insight-section-title" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--accent-gold)", marginBottom: 6 }}>Recommended Exercises</span>
                                <div className="trials-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {selectedTopic.aiAnalysis.relevantTrials.map((trial, i) => {
                                    const isUrl = trial.startsWith('http');
                                    const href = isUrl ? trial : `https://www.google.com/search?q=${encodeURIComponent(trial)}`;
                                    return (
                                      <a 
                                        key={i} 
                                        href={href} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="trial-link"
                                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#60a5fa", textDecoration: "none" }}
                                      >
                                        {trial} <ExternalLink size={10} />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Active Recall Quiz */}
                            {selectedTopic.aiAnalysis.recallQuestions && selectedTopic.aiAnalysis.recallQuestions.length > 0 && (
                              <div className="quiz-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16, marginTop: 16 }}>
                                <h4 className="insight-section-title" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--accent-gold)", margin: "0 0 12px 0" }}>
                                  Active Recall Quiz (+15 Karma points)
                                </h4>
                                
                                {roadmapData?.[`quiz_completed_${selectedTopic.id}`] || quizSubmitted ? (
                                  <div className="quiz-completed-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>
                                    ✓ Active Recall Quiz Completed (+15 Karma)
                                  </div>
                                ) : (
                                  <form onSubmit={handleQuizSubmit}>
                                    {selectedTopic.aiAnalysis.recallQuestions.map((q, idx) => (
                                      <div key={idx} className="quiz-question-box" style={{ marginBottom: 12 }}>
                                        <div className="quiz-question-text" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Q{idx+1}: {q}</div>
                                        <textarea 
                                          className="quiz-answer-input"
                                          rows={2}
                                          placeholder="Type your brief explanation..."
                                          value={quizAnswers[idx] || ""}
                                          onChange={(e) => {
                                            const updated = [...quizAnswers];
                                            updated[idx] = e.target.value;
                                            setQuizAnswers(updated);
                                          }}
                                          style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: 8, borderRadius: 4, fontSize: 12, resize: "none" }}
                                        />
                                      </div>
                                    ))}
                                    <button 
                                      type="submit"
                                      className="btn btn-gold"
                                      style={{ fontSize: 12, padding: "6px 12px", minHeight: "auto", display: "flex", alignItems: "center", gap: 4 }}
                                    >
                                      Submit Quiz Answers
                                    </button>
                                  </form>
                                )}
                              </div>
                            )}

                            {/* Re-evaluation button */}
                            <button 
                              onClick={submitForMeditation} 
                              disabled={isMeditating} 
                              className="btn btn-secondary"
                              style={{ width: "100%", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", fontSize: 12 }}
                            >
                              {isMeditating ? (
                                <>
                                  <Loader size={14} className="spinner" />
                                  Evaluating...
                                </>
                              ) : "Re-evaluate Reflection Notes"}
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", padding: "20px 10px" }}>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
                              Have you completed your study? Submit your Sadhana notes to have the Acharya evaluate your progress and generate a practice quiz.
                            </p>
                            <button 
                              onClick={submitForMeditation} 
                              disabled={isMeditating} 
                              className="btn btn-gold"
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px" }}
                            >
                              {isMeditating ? (
                                <>
                                  <Loader size={14} className="spinner" />
                                  Acharya is meditating...
                                </>
                              ) : "Submit Notes for Acharya Evaluation"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === "chat" && (
                      <div className="yatra-acharya-chat-tutor">
                        <div className="yatra-chat-messages">
                          {chatHistory.map((msg, i) => (
                            <div key={i} className="yatra-chat-message-bubble">
                              <strong>{msg.role === "user" ? "You: " : "Acharya: "}</strong>{msg.content}
                            </div>
                          ))}
                        </div>
                        <div className="yatra-chat-input-row">
                          <input type="text" placeholder="Ask doubt..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&sendChatMessage()} className="yatra-chat-input" />
                          <button onClick={sendChatMessage} className="yatra-chat-send-btn"><Send size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          <div className="yatra-workspace-empty-state">
            <span className="empty-emoji">🛕</span>
            <h2 className="empty-title">GyanYatra Study Space</h2>
            <p className="empty-text">Select a node topic from the left catalog index dashboard to initialize your learning session path mapping.</p>
          </div>
        )}
      </div>

    </div>
  );
}