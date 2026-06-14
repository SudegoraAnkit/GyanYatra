import { useState, useEffect, useRef } from "react";
import { Play, Clock, CheckCircle, Send, Loader, ExternalLink, Sparkles, Edit, BookOpen, ChevronDown, ChevronRight, Eye, RefreshCw, Award, Volume2, X, Maximize, Minimize } from "lucide-react";
import { TypewriterText } from "./App";

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
  const [justMeditatedTopicId, setJustMeditatedTopicId] = useState(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

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

  // Handle topic change
  const selectTopic = (topic) => {
    if (timerRunning) {
      // Save current timer progress before switching
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

  const formatTargetDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getStatusConfig = (status) => {
    const config = {
      "not-started": { label: "Not Started", color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "○" },
      "in-progress": { label: "In Progress", color: "#f39c12", bg: "rgba(243,156,18,0.15)", icon: "◑" },
      "done": { label: "Done", color: "#10b981", bg: "rgba(16,185,129,0.15)", icon: "●" },
      "needs-revision": { label: "Revision", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", icon: "↺" }
    };
    return config[status] || config["not-started"];
  };

  // Cycle topic status
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

    // Update selectedTopic status in state
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic(prev => ({ ...prev, status: nextStatus }));
    }
  };

  // Auto-discover video title
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

  // Update specific topic fields and save
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

  // Save Notes and Video URL manually
  const saveNotesAndVideo = () => {
    updateTopicField(selectedTopic.id, {
      userNotes: notesInput,
      videoUrl: videoUrlInput
    });
    alert("Sadhana details successfully saved.");
  };

  // Submit notes to Acharya for Meditation review
  const submitForMeditation = async () => {
    if (!notesInput.trim()) {
      alert("Please record some Sadhana notes before invoking the Acharya.");
      return;
    }
    setIsMeditating(true);
    try {
      // Ensure notes/video URL are saved in the tree first
      updateTopicField(selectedTopic.id, {
        userNotes: notesInput,
        videoUrl: videoUrlInput
      });

      const persona = user.acharyaPersona || "dronacharya";
      const res = await fetch(`${API_BASE}/yatras/${yatra.id}/topics/${selectedTopic.id}/meditate?persona=${persona}&simulate=${simulateMeditation}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        // Locate updated topic in the returned tree
        const findNode = (list) => {
          for (let item of list) {
            if (item.id === selectedTopic.id) return item;
            if (item.subtopics && item.subtopics.length > 0) {
              const f = findNode(item.subtopics);
              if (f) return f;
            }
          }
          return null;
        };
        const updatedNode = findNode(updated.topics);
        if (updatedNode) {
          setSelectedTopic(updatedNode);
          setJustMeditatedTopicId(selectedTopic.id);
        }
        onUpdate(updated); // Update root state
        setQuizSubmitted(false);
        setQuizAnswers(["", "", ""]);
      } else {
        alert("Acharya's meditation was interrupted. Please try again.");
      }
    } catch (e) {
      console.error("Acharya review request failed:", e);
    } finally {
      setIsMeditating(false);
    }
  };

  // Chat with Acharya tutor
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
      setChatHistory(prev => [...prev, { role: "assistant", content: "Error connecting to Acharya. Check connection." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Submit active recall quiz
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
        alert("Dhanyavaad! Active Recall quiz submitted. You are awarded +15 Karma points!");
      }
    } catch (e) {
      console.error("Failed to submit quiz karma:", e);
    }
  };

  // Calculate general progress metrics
  const getProgressStats = () => {
    let totalItems = 0;
    let completedItems = 0;
    let totalTime = 0;
    let targetTime = 0;

    const traverse = (list) => {
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

  // Recursive tree renderer
  const YatraTreeNode = ({ node, depth = 0 }) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.subtopics && node.subtopics.length > 0;
    const isSelected = selectedTopic && selectedTopic.id === node.id;
    const isCompleted = node.status === "done";
    const isProgress = node.status === "in-progress";

    return (
      <div style={{ marginLeft: depth > 0 ? "20px" : "0px", borderLeft: depth > 0 ? "2px dashed rgba(255, 255, 255, 0.15)" : "none", paddingLeft: depth > 0 ? "16px" : "0px", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px 12px", borderRadius: "var(--radius-sm)", background: isSelected ? "var(--accent-gold-glow)" : "transparent", border: isSelected ? "1px solid var(--accent-gold)" : "1px solid transparent", cursor: "pointer", transition: "all 0.2s" }}>
          
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <div style={{ width: 14 }} />
          )}

          <button onClick={(e) => { e.stopPropagation(); cycleStatus(node.id); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "0 2px" }} title={`Status: ${node.status || "not-started"}. Click to cycle.`}>
            {isCompleted ? (
              <CheckCircle size={15} style={{ color: "var(--color-success)" }} />
            ) : isProgress ? (
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            ) : (
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--text-muted)", display: "inline-block", background: "transparent", opacity: 0.5 }} />
            )}
          </button>

          <div onClick={() => selectTopic(node)} style={{ flex: 1, fontSize: 13, color: isSelected ? "var(--text-primary)" : isCompleted ? "var(--text-secondary)" : "var(--text-muted)", fontWeight: isSelected ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.title || "Untitled Topic"}
          </div>

          {node.timeSpent > 0 && (
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              {formatDuration(node.timeSpent)}
            </span>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <div style={{ marginTop: "4px", marginBottom: "4px" }}>
            {node.subtopics.map(child => (
              <YatraTreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderNavigationTree = () => (
    <div className="yatra-tracker-sidebar" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
        <button onClick={() => { if (timerRunning) { saveTimeSpent(selectedTopic?.id, timerSeconds); } onBack(); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          ← Back to Gallery
        </button>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", margin: 0, color: "var(--accent-gold)" }}>{yatra.title}</h3>
        
        {/* Global Progress Bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            <span>Progress</span>
            <span>{stats.pct}% Complete</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${stats.pct}%`, background: "var(--color-success)" }} />
          </div>
        </div>
      </div>

      {/* Progress Cycle Legend */}
      <div className="yatra-progress-legend" style={{ padding: "10px 16px 10px 16px", fontSize: 11, color: "var(--text-muted)", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.05)", lineHeight: 1.4 }}>
        Click node symbols to cycle progress metrics:<br />
        <span style={{ color: "var(--text-secondary)" }}>○ Not Started ➔ ◑ In Progress ➔ ● Completed</span>
      </div>

      {/* Tree List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {yatra.topics && yatra.topics.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {yatra.topics.map(topic => (
              <YatraTreeNode key={topic.id} node={topic} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 12 }}>
            No topics in this Lakshya. Edit the structure to add topics!
          </div>
        )}
      </div>
    </div>
  );

  const renderMediaDeck = () => {
    if (videoId) {
      return (
        <div className="yatra-video-container">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={selectedTopic.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    } else if (videoUrlInput && (videoUrlInput.startsWith("http://") || videoUrlInput.startsWith("https://") || videoUrlInput.includes("."))) {
      return (
        <div className="yatra-resource-banner">
          <ExternalLink size={32} className="resource-icon" />
          <h4>External Study Resource</h4>
          <p style={{ fontSize: 12, wordBreak: "break-all" }}>{videoUrlInput}</p>
          <a 
            href={videoUrlInput.startsWith("http") ? videoUrlInput : `https://${videoUrlInput}`}
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-gold"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
          >
            <span>Open Study Resource Web Link</span>
            <ExternalLink size={14} />
          </a>
        </div>
      );
    } else {
      return (
        <div className="yatra-video-placeholder">
          <Play size={32} />
          <span style={{ fontSize: 13 }}>No study resource linked. Paste a link below to study.</span>
        </div>
      );
    }
  };

  return (
    <div className="yatra-tracker-container">
      {!selectedTopic ? (
        <>
          {renderNavigationTree()}
          
          {/* Introduction Screen when no topic is selected */}
          <div className="yatra-tracker-body" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 40, textAlign: "center", overflowY: "auto" }}>
            <span style={{ fontSize: "3rem", marginBottom: 16 }}>🛕</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--accent-gold)", margin: 0 }}>
              Welcome to {yatra.title}
            </h2>
            <p style={{ maxWidth: 500, color: "var(--text-secondary)", fontSize: 13, marginTop: 8, marginBottom: 24 }}>
              {yatra.description || "Begin your custom knowledge path. Choose a topic from the left sidebar to start your Sadhana session (timer, notes, and AI tutor reviews)."}
            </p>

            {/* General Stats */}
            <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
              <div className="card" style={{ padding: "12px 24px", minWidth: 120, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase" }}>Completed</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "var(--color-success)" }}>
                  {stats.completedItems} / {stats.totalItems}
                </div>
              </div>

              <div className="card" style={{ padding: "12px 24px", minWidth: 120, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase" }}>Time Spent</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "var(--accent-gold)" }}>
                  {formatDuration(stats.totalTime)}
                </div>
              </div>

              <div className="card" style={{ padding: "12px 24px", minWidth: 120, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase" }}>Target Duration</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#38bdf8" }}>
                  {formatTargetDuration(stats.targetTime)}
                </div>
              </div>
            </div>

            {/* Sanskrit Quote Banner */}
            <div style={{ padding: "16px 20px", background: "rgba(243,156,18,0.02)", border: "1px solid rgba(243,156,18,0.1)", borderRadius: "var(--radius-md)", maxWidth: 500 }}>
              <div style={{ color: "var(--accent-gold)", fontWeight: 700, fontSize: 14, fontStyle: "italic", marginBottom: 6 }}>
                "ज्ञानेन सदृशं पवित्रमिह विद्यते।"
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                "Indeed, there is nothing in this world as purifying as knowledge." — Bhagavad Gita (4.38)
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="yatra-tracker-body">
          <div className="yatra-tracker-workspace-wrapper">
            {/* Topic Header & Timer */}
            <div className="yatra-tracker-header">
              <div>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Sadhana Topic</span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "2px 0 0 0", fontFamily: "var(--font-display)" }}>{selectedTopic.title || "Untitled"}</h2>
              </div>
 
              {/* Study Timer Panel */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: timerRunning ? "rgba(243,156,18,0.1)" : "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", border: timerRunning ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)" }}>
                  <Clock size={16} style={{ color: timerRunning ? "var(--accent-gold)" : "var(--text-muted)" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}>
                    {timerRunning ? formatDuration(timerSeconds) : formatDuration(selectedTopic.timeSpent || 0)}
                  </span>
                  {selectedTopic.targetTime > 0 && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      / {formatTargetDuration(selectedTopic.targetTime)} goal
                    </span>
                  )}
                </div>
 
                <button
                  onClick={() => {
                    if (timerRunning) {
                      saveTimeSpent(selectedTopic.id, timerSeconds);
                      setTimerSeconds(0);
                    }
                    setTimerRunning(!timerRunning);
                  }}
                  className={`btn ${timerRunning ? "btn-secondary" : "btn-gold"}`}
                  style={{ minHeight: "auto", padding: "6px 14px", fontSize: 13 }}
                >
                  {timerRunning ? "Stop Timer" : "Start Study"}
                </button>
 
                {/* Vistara/Ekagrata Mode Toggle Button next to Start Study */}
                <button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className="btn btn-secondary"
                  style={{ minHeight: "auto", padding: "6px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                  title={isTheaterMode ? "Switch to Ekagrata Mode (Focus Layout)" : "Switch to Vistara Mode (Expanded Layout)"}
                >
                  {isTheaterMode ? (
                    <>
                      <Minimize size={14} />
                      <span>Ekagrata Mode</span>
                    </>
                  ) : (
                    <>
                      <Maximize size={14} />
                      <span>Vistara Mode</span>
                    </>
                  )}
                </button>
              </div>
            </div>
 
            {/* Split Screen Workspace */}
            <div className={`yatra-sadhana-workspace ${isTheaterMode ? "workspace-vistara" : "workspace-ekagrata"}`}>
              {/* Left Column: Media & Notes */}
              <div className="yatra-sadhana-media-pane">
                <div className="yatra-video-wrapper">
                  {/* Title / Action bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Sadhana Video</span>
                    {videoUrlInput && (
                      <button
                        onClick={() => setIsTheaterMode(!isTheaterMode)}
                        className="btn btn-secondary"
                        style={{ minHeight: "auto", padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                        title={isTheaterMode ? "Switch to Ekagrata Mode (Focus Layout)" : "Switch to Vistara Mode (Expanded Layout)"}
                      >
                        {isTheaterMode ? (
                          <>
                            <Minimize size={12} />
                            <span>Ekagrata Mode</span>
                          </>
                        ) : (
                          <>
                            <Maximize size={12} />
                            <span>Vistara Mode</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
 
                  {/* Multi-Resource Media Deck (YouTube Frame vs. Alternative Web URLs) */}
                  {renderMediaDeck()}
 
                  {/* Link Paste / Auto Discovery */}
                  <div className="yatra-video-link-row">
                    <input
                      type="text"
                      placeholder="Paste YouTube Video URL or general reference web link..."
                      value={videoUrlInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVideoUrlInput(val);
                        updateTopicField(selectedTopic.id, { videoUrl: val });
                      }}
                      className="yatra-video-input"
                    />
                    <button onClick={discoverVideoTitle} disabled={isDiscovering || !videoUrlInput} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", minHeight: "auto", fontSize: 13 }}>
                      {isDiscovering ? <Loader size={14} className="spinner" /> : <Sparkles size={14} />} Auto-Discover
                    </button>
                  </div>
                </div>
 
                {/* Seeker's Sadhana Notes rendered in left column if NOT in Vistara mode */}
                {!isTheaterMode && (
                  <div className="yatra-sadhana-notes">
                    <div className="yatra-notes-container">
                      <div className="yatra-notes-header">
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Sadhana Reflection Notes</label>
                        <button onClick={saveNotesAndVideo} className="btn btn-secondary" style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}>
                          Save Notes
                        </button>
                      </div>
                      <textarea
                        placeholder="Write detailed engineering notes, code trials, summaries, or questions. The Acharya will grade you on depth and completeness..."
                        className="yatra-notes-textarea"
                        value={notesInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNotesInput(val);
                          updateTopicField(selectedTopic.id, { userNotes: val });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
 
              {/* Right Column: Notes (in Vistara mode) & AI Acharya panel / Navigation Tree (in Ekagrata mode) */}
              <div className="yatra-sadhana-acharya-pane">
                {/* Seeker's Sadhana Notes rendered in right column if IN Vistara mode */}
                {isTheaterMode && (
                  <div className="yatra-sadhana-notes">
                    <div className="yatra-notes-container">
                      <div className="yatra-notes-header">
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Sadhana Reflection Notes</label>
                        <button onClick={saveNotesAndVideo} className="btn btn-secondary" style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}>
                          Save Notes
                        </button>
                      </div>
                      <textarea
                        placeholder="Write detailed engineering notes, code trials, summaries, or questions. The Acharya will grade you on depth and completeness..."
                        className="yatra-notes-textarea"
                        value={notesInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNotesInput(val);
                          updateTopicField(selectedTopic.id, { userNotes: val });
                        }}
                      />
                    </div>
                  </div>
                )}
 
                {/* Navigation tree panel rendered in the Right Column in Standard Mode */}
                {!isTheaterMode && renderNavigationTree()}
 
                <div className="yatra-acharya-panel">
                  {/* Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                    <button onClick={() => setActiveTab("sadhana")} style={{ flex: 1, padding: "12px", background: "none", border: "none", borderBottom: activeTab === "sadhana" ? "2px solid var(--accent-gold)" : "none", color: activeTab === "sadhana" ? "var(--accent-gold)" : "var(--text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                      🧘 Acharya Review
                    </button>
                    <button onClick={() => setActiveTab("chat")} style={{ flex: 1, padding: "12px", background: "none", border: "none", borderBottom: activeTab === "chat" ? "2px solid var(--accent-gold)" : "none", color: activeTab === "chat" ? "var(--accent-gold)" : "var(--text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                      💬 Sadhana Chat Tutor
                    </button>
                  </div>
 
                  {/* Tab Contents */}
                  <div className="yatra-acharya-body">
                    
                    {activeTab === "sadhana" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {isMeditating ? (
                          <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <Loader size={36} className="spinner" style={{ color: "var(--accent-gold)" }} />
                            <h4 style={{ fontFamily: "var(--font-display)", margin: 0 }}>Acharya is Meditating</h4>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 300, margin: 0 }}>
                              Reviewing notes, assessing understanding depth, and preparing active recall questions...
                            </p>
                          </div>
                        ) : selectedTopic.aiAnalysis ? (
                          <div>
                            {/* Score and Overview */}
                            <div className="card" style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.15)", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <span style={{ fontSize: 12, textTransform: "uppercase", color: "var(--color-success)", fontWeight: 600, letterSpacing: "0.05em" }}>Evaluation Complete</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Award size={16} style={{ color: "var(--accent-gold)" }} />
                                  <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedTopic.aiAnalysis.score || 0} Karma</span>
                                </div>
                              </div>
                              
                              {/* Sanskrit quote display */}
                              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)", fontStyle: "italic", margin: 0 }}>
                                {selectedTopic.id === justMeditatedTopicId ? (
                                  <TypewriterText text={selectedTopic.aiAnalysis.feedback} />
                                ) : (
                                  selectedTopic.aiAnalysis.feedback
                                )}
                              </p>
                            </div>
 
                            {/* Concepts Grasped */}
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Grasped Concepts</h4>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {selectedTopic.aiAnalysis.identifiedConcepts?.map((c, i) => (
                                  <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 4, color: "#9bf" }}>
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
 
                            {/* Gap Suggestions */}
                            {selectedTopic.aiAnalysis.gapSuggestions?.length > 0 && (
                              <div style={{ marginBottom: 16 }}>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Gaps in Understanding</h4>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                  {selectedTopic.aiAnalysis.gapSuggestions.map((g, i) => (
                                    <li key={i}>{g}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
 
                            {/* Reference Trials (Practice) */}
                            {selectedTopic.aiAnalysis.relevantTrials?.length > 0 && (
                              <div style={{ marginBottom: 24 }}>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Recommended Trials (Practice Links)</h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {selectedTopic.aiAnalysis.relevantTrials.map((link, i) => (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--accent-gold)", fontSize: 12, textDecoration: "none" }}>
                                      <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{link}</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
 
                            {/* Active Recall Quiz */}
                            {selectedTopic.aiAnalysis.recallQuestions?.length > 0 && (
                              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                                  <Sparkles size={16} /> Active Recall Challenge
                                </h4>
 
                                {quizSubmitted ? (
                                  <div style={{ padding: "12px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                                    <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>Challenge Accomplished!</div>
                                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Your answers have been registered, and +15 Karma points have been awarded.</div>
                                    </div>
                                  </div>
                                ) : (
                                  <form onSubmit={handleQuizSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {selectedTopic.aiAnalysis.recallQuestions.map((q, idx) => (
                                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        <label style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{idx + 1}. {q}</label>
                                        <input
                                          type="text"
                                          placeholder="Write your answer..."
                                          value={quizAnswers[idx] || ""}
                                          onChange={(e) => {
                                            const next = [...quizAnswers];
                                            next[idx] = e.target.value;
                                            setQuizAnswers(next);
                                          }}
                                          style={{ background: "rgba(0,0,0,0.15)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}
                                        />
                                      </div>
                                    ))}
                                    <button type="submit" className="btn btn-gold" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", minHeight: "auto", fontSize: 13, marginTop: 6 }}>
                                      Submit Answers & Claim Karma (+15)
                                    </button>
                                  </form>
                                )}
                              </div>
                            )}
 
                            {/* Re-Meditate */}
                            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                              <button onClick={submitForMeditation} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", minHeight: "auto", fontSize: 12 }}>
                                <RefreshCw size={12} /> Re-Submit for Review
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: "2rem" }}>🧘</span>
                            <h4 style={{ fontFamily: "var(--font-display)", margin: 0 }}>Consult the Acharya</h4>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 300, margin: 0 }}>
                              Once you have taken study notes, submit them for evaluation. The Acharya will analyze your depth, suggest concepts, point out gaps, and formulate active recall challenges.
                            </p>
 
                            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                              <input
                                type="checkbox"
                                id="simulate"
                                checked={simulateMeditation}
                                onChange={(e) => setSimulateMeditation(e.target.checked)}
                                style={{ cursor: "pointer" }}
                              />
                              <label htmlFor="simulate" style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
                                Simulate offline review (free-tier / instant)
                              </label>
                            </div>
 
                            <button onClick={submitForMeditation} className="btn btn-gold" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", fontSize: 13 }}>
                              <Sparkles size={14} /> Submit for Acharya Review
                            </button>
                          </div>
                        )}
                      </div>
                    )}
 
                    {activeTab === "chat" && (
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* Chat Messages */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                          {chatHistory.length === 0 && (
                            <div style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: 20 }}>
                              The Acharya awaits your queries. Ask about replication, caching, or anything from the study notes.
                            </div>
                          )}
                          {chatHistory.map((msg, i) => (
                            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "10px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.5, background: msg.role === "user" ? "var(--color-primary-glow)" : "rgba(255,255,255,0.03)", border: msg.role === "user" ? "1px solid var(--color-primary)" : "1px solid var(--border-color)", whiteSpace: "pre-wrap" }}>
                              <strong>{msg.role === "user" ? "Seeker: " : "Acharya: "}</strong>
                              {msg.role === "assistant" && i === chatHistory.length - 1 ? (
                                <TypewriterText text={msg.content} />
                              ) : (
                                msg.content
                              )}
                            </div>
                          ))}
                          {chatLoading && (
                            <div style={{ alignSelf: "flex-start", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border-color)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                              <Loader size={12} className="spinner" /> Acharya is pondering...
                            </div>
                          )}
                        </div>
 
                        {/* Chat Input */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="text"
                            placeholder="Ask a doubt..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                            style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}
                          />
                          <button onClick={sendChatMessage} className="btn btn-gold" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", minHeight: "auto" }}>
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    )}
 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
