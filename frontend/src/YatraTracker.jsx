import { useState, useEffect } from "react";
import { Play, Clock, Send, Loader, ExternalLink, Sparkles, ChevronDown, ChevronRight, Menu, BookOpen } from "lucide-react";

export default function YatraTracker({ yatra, user, onUpdate, onBack, onRecordStudy }) {
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
        onUpdate(updated);
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
        alert("Dhanyavaad! You are awarded +15 Karma points!");
      }
    } catch (e) {
      console.error(e);
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

          <button onClick={(e) => { e.stopPropagation(); cycleStatus(node.id); }} style={{ background: "none", border: "none", color: statusCfg.color, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {statusCfg.icon}
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
        <span className="yatra-notes-autosave-indicator">Auto-saving Changes</span>
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
                  onClick={() => setTimerRunning(!timerRunning)}
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
                      <div className="yatra-acharya-sadhana-review">
                        <button onClick={submitForMeditation} className="btn btn-gold yatra-meditation-submit-btn">
                          Submit Notes for Acharya Evaluation
                        </button>
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