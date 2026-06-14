import { useState, useEffect } from "react";
import { Play, Clock, Send, Loader, ExternalLink, Sparkles, ChevronDown, ChevronRight } from "lucide-react";

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
  
  // Custom Sidebar View State (Standard Split vs Wide Theater View)
  const [isVistaraMode, setIsVistaraMode] = useState(false);

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
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Sadhana Reflection Notes</label>
        <span style={{ fontSize: 11, color: "#64748b" }}>Auto-saving Changes</span>
      </div>
      <textarea
        placeholder="Type continuous reflection summaries here..."
        value={notesInput}
        onChange={(e) => handleNotesChange(e.target.value)}
        style={{ 
          width: "100%", height: isTall ? "340px" : "180px", background: "rgba(0,0,0,0.3)", 
          border: "1px solid #475569", color: "#fff", padding: "12px", borderRadius: "6px", 
          fontFamily: "monospace", fontSize: 13, resize: "none", lineHeight: 1.5 
        }}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", width: "100%", background: "#0f172a", color: "#f8fafc", overflow: "hidden" }}>
      
      {/* LEFT NAVIGATION TREE PANE */}
      <div style={{ width: "320px", minWidth: "320px", borderRight: "1px solid #334155", display: "flex", flexDirection: "column", background: "#1e293b", height: "100%" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #334155" }}>
          <button onClick={() => { if (timerRunning) { saveTimeSpent(selectedTopic.id, timerSeconds); } onBack(); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            ← Gallery Index
          </button>
          <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "#10b981" }}>{yatra.title}</h3>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <span style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 12 }}>
            💡 Cycle completion: Click the circle icon symbols (○/●) inside the directory layout tree.
          </span>
          {yatra.topics?.map(topic => (
            <YatraTreeNode key={topic.id} node={topic} />
          ))}
        </div>
      </div>

      {/* RIGHT WORKSPACE CONTEXT ENGINE */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
        {selectedTopic ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Header Toolbar controls */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{selectedTopic.title || "Selected Lesson"}</h2>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setIsVistaraMode(!isVistaraMode)}
                  style={{ background: isVistaraMode ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${isVistaraMode ? "#10b981" : "#475569"}`, color: isVistaraMode ? "#10b981" : "#cbd5e1", borderRadius: "6px", padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                >
                  {isVistaraMode ? "Standard Split View" : "Wide Theater View"}
                </button>
                <div style={{ fontFamily: "monospace", fontSize: 13, background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: 4 }}>
                  ⏱ {formatDuration(timerSeconds || selectedTopic.timeSpent || 0)}
                </div>
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  style={{ background: timerRunning ? "#ef4444" : "#10b981", color: "#0f172a", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {timerRunning ? "Stop" : "Study"}
                </button>
              </div>
            </div>

            {/* SPLIT COLUMN VIEW GRID */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: isVistaraMode ? "1.8fr 1fr" : "1fr 1fr", overflow: "hidden" }}>
              
              {/* MEDIA DECK GRID CONTAINER */}
              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", padding: "20px", borderRight: "1px solid #334155", height: "100%" }}>
                
                {videoId ? (
                  <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: "10px", overflow: "hidden" }}>
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`} title={selectedTopic.title} frameBorder="0" allowFullScreen />
                  </div>
                ) : videoUrlInput && videoUrlInput.startsWith("http") ? (
                  /* High-Visibility General Documentation Web Banner mapped with Green accents */
                  <div style={{ width: "100%", padding: "32px 24px", background: "#1e293b", border: "2px dashed #475569", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textCenter: "center" }}>
                    <ExternalLink size={36} style={{ color: "#10b981" }} />
                    <span style={{ fontSize: "14px", color: "#cbd5e1", fontWeight: 600 }}>Linked Reference Resource:</span>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>{videoUrlInput}</p>
                    <a href={videoUrlInput} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "#10b981", color: "#0f172a", textDecoration: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700 }}>
                      Open Study Resource Web Link ↗
                    </a>
                  </div>
                ) : (
                  <div style={{ width: "100%", aspectRatio: "16/9", background: "rgba(0,0,0,0.2)", borderRadius: "10px", border: "1px dashed #475569", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#64748b" }}>
                    <Play size={24} /> 
                    <span style={{ fontSize: 12, marginTop: 6 }}>Paste YouTube link or reference Web address down below to begin study.</span>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Paste YouTube Link or Documentation URL here..."
                  value={videoUrlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #475569", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}
                />

                {/* Show Notes underneath player ONLY during normal layout */}
                {!isVistaraMode && renderNotesContainer(false)}
              </div>

              {/* INTEGRATED INTERACTIVE SIDEBAR WRAPPER CONTAINER */}
              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", padding: "20px", gap: "16px", height: "100%" }}>
                
                {/* Dynamically push Notes to the top of the Sidebar when wide view is activated */}
                {isVistaraMode && renderNotesContainer(true)}

                {/* AI Acharya tab section layout with updated Green selection borders */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid #334155", borderRadius: "10px", background: "#1e293b", overflow: "hidden" }}>
                  <div style={{ display: "flex", borderBottom: "1px solid #334155", background: "rgba(0,0,0,0.1)" }}>
                    <button onClick={() => setActiveTab("sadhana")} style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: activeTab === "sadhana" ? "2px solid #10b981" : "none", color: activeTab === "sadhana" ? "#10b981" : "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🧘 Acharya Review</button>
                    <button onClick={() => setActiveTab("chat")} style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: activeTab === "chat" ? "2px solid #10b981" : "none", color: activeTab === "chat" ? "#10b981" : "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💬 Doubt Chat</button>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
                    {activeTab === "sadhana" && (
                      <div style={{ textAlign: "center", padding: "10px" }}>
                        <button onClick={submitForMeditation} style={{ background: "#10b981", color: "#0f172a", border: "none", padding: "8px 14px", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          Submit Notes for Acharya Evaluation
                        </button>
                      </div>
                    )}
                    {activeTab === "chat" && (
                      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", marginBottom: 12 }}>
                          {chatHistory.map((msg, i) => (
                            <div key={i} style={{ padding: "8px 10px", borderRadius: 6, fontSize: 12, background: "rgba(255,255,255,0.02)", border: "1px solid #334155" }}>
                              <strong>{msg.role === "user" ? "You: " : "Acharya: "}</strong>{msg.content}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <input type="text" placeholder="Ask doubt..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&sendChatMessage()} style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid #475569", padding: "6px", color: "#fff", borderRadius: 4 }} />
                          <button onClick={sendChatMessage} style={{ background: "#10b981", padding: "6px 12px", border: "none", borderRadius: 4 }}><Send size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 40, textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem" }}>🛕</span>
            <h2 style={{ fontWeight: 700, color: "#10b981", margin: "10px 0 0 0" }}>GyanYatra Study Space</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, maxWidth: 400 }}>Select a node topic from the left catalog index dashboard to initialize your learning session path mapping.</p>
          </div>
        )}
      </div>

    </div>
  );
}