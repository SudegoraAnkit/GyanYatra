import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Save, X, BookOpen, Clock, ChevronDown, ChevronRight } from "lucide-react";

export default function YatraDesigner({ yatra, onSave, onClose }) {
  const [title, setTitle] = useState(yatra?.title || "");
  const [description, setDescription] = useState(yatra?.description || "");
  const [isPublic, setIsPublic] = useState(yatra?.isPublic ?? false);
  const [topics, setTopics] = useState(yatra?.topics || []);
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const findNodeById = (list, id) => {
    for (let item of list) {
      if (item.id === id) return item;
      if (item.subtopics && item.subtopics.length > 0) {
        const found = findNodeById(item.subtopics, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = selectedNodeId ? findNodeById(topics, selectedNodeId) : null;

  const toggleCollapse = (id) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addTopic = (parentId = null) => {
    const newTopic = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      title: "",
      status: "not-started",
      timeSpent: 0,
      targetTime: 60, // default target time: 60 minutes
      videoUrl: "",
      userNotes: "",
      subtopics: []
    };

    if (!parentId) {
      setTopics([...topics, newTopic]);
    } else {
      const updateTree = (list) => {
        return list.map(item => {
          if (item.id === parentId) {
            return { ...item, subtopics: [...(item.subtopics || []), newTopic] };
          }
          if (item.subtopics && item.subtopics.length > 0) {
            return { ...item, subtopics: updateTree(item.subtopics) };
          }
          return item;
        });
      };
      setTopics(updateTree(topics));
      setCollapsedNodes(prev => ({ ...prev, [parentId]: false })); // Expand parent
    }
  };

  const updateTopic = (id, fields) => {
    const updateTree = (list) => {
      return list.map(item => {
        if (item.id === id) {
          return { ...item, ...fields };
        }
        if (item.subtopics && item.subtopics.length > 0) {
          return { ...item, subtopics: updateTree(item.subtopics) };
        }
        return item;
      });
    };
    setTopics(updateTree(topics));
  };

  const removeTopic = (id) => {
    if (!window.confirm("Are you sure you want to remove this topic and all its subtopics?")) {
      return;
    }
    const removeFromTree = (list) => {
      return list
        .filter(item => item.id !== id)
        .map(item => {
          if (item.subtopics && item.subtopics.length > 0) {
            return { ...item, subtopics: removeFromTree(item.subtopics) };
          }
          return item;
        });
    };
    setTopics(removeFromTree(topics));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a Yatra title.");
      return;
    }
    onSave({
      ...yatra,
      title,
      description,
      isPublic,
      topics
    });
  };



  return (
    <div style={{ padding: "24px", maxWidth: "850px", margin: "0 auto", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", color: "var(--accent-gold)", margin: 0 }}>
            {yatra ? "🛕 Modify SatsangYatra / Lakshya" : "🛕 Design New SatsangYatra / Lakshya"}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            Create a custom study path. Every topic can house timers, notes, video logs, and AI Acharya analysis.
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>

      {/* Yatra Meta Form */}
      <div className="card" style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Yatra Title / Goal Name</label>
          <input
            type="text"
            placeholder="e.g. Advanced System Design & Scalability"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Description / Objective</label>
          <textarea
            placeholder="Describe the ultimate destination of this knowledge path..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: "var(--radius-sm)", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              {isPublic ? <Eye size={16} style={{ color: "var(--color-success)" }} /> : <EyeOff size={16} style={{ color: "var(--text-muted)" }} />}
              {isPublic ? "Public SatsangYatra" : "Private Lakshya"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {isPublic ? "Visible in the shared temple gallery. Other seekers can browse and clone it." : "Only visible to you."}
            </div>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`btn ${isPublic ? "btn-gold" : "btn-secondary"}`}
            style={{ minHeight: "auto", padding: "6px 12px", fontSize: 12 }}
          >
            Switch to {isPublic ? "Private" : "Public"}
          </button>
        </div>
      </div>

      {/* Curriculum Nodes Editor & Drawer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", marginBottom: "32px", minHeight: "450px" }}>
        
        {/* Canvas Area */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>Roadmap Structure</h3>
            <button onClick={() => addTopic(null)} className="btn btn-gold" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", minHeight: "auto", fontSize: 12 }}>
              <Plus size={14} /> Add Root Topic
            </button>
          </div>

          <div style={{ flex: 1, maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
            {topics.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", fontSize: 13 }}>
                No topics defined yet. Click "Add Root Topic" to begin mapping your yatra.
              </div>
            ) : (
              <div>
                {topics.map(topic => (
                  <DesignNode 
                    key={topic.id} 
                    node={topic} 
                    collapsedNodes={collapsedNodes}
                    toggleCollapse={toggleCollapse}
                    selectedNodeId={selectedNodeId}
                    onSelect={setSelectedNodeId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Area */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "16px", display: "flex", flexDirection: "column", height: "fit-content", minHeight: "350px" }}>
          {selectedNode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-gold)" }}>Configure Node</span>
                <button onClick={() => setSelectedNodeId(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Topic Title</label>
                <input
                  type="text"
                  placeholder="e.g. Master Replication"
                  value={selectedNode.title}
                  onChange={(e) => updateTopic(selectedNode.id, { title: e.target.value })}
                  style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "8px 10px", borderRadius: 4, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Target Duration (minutes)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    value={selectedNode.targetTime}
                    onChange={(e) => updateTopic(selectedNode.id, { targetTime: parseInt(e.target.value) || 0 })}
                    style={{ width: "80px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "8px 10px", borderRadius: 4, fontSize: 13, textAlign: "center" }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>minutes</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>YouTube Video URL</label>
                <input
                  type="text"
                  placeholder="Paste YouTube link here..."
                  value={selectedNode.videoUrl || ""}
                  onChange={(e) => updateTopic(selectedNode.id, { videoUrl: e.target.value })}
                  style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "8px 10px", borderRadius: 4, fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Initial Study Notes</label>
                <textarea
                  placeholder="Write initial notes or outlines here..."
                  value={selectedNode.userNotes || ""}
                  onChange={(e) => updateTopic(selectedNode.id, { userNotes: e.target.value })}
                  rows={4}
                  style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "8px 10px", borderRadius: 4, fontSize: 12, resize: "vertical", fontFamily: "monospace" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button
                  onClick={() => addTopic(selectedNode.id)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "8px", minHeight: "auto", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <Plus size={12} /> Subtopic
                </button>
                <button
                  onClick={() => { removeTopic(selectedNode.id); setSelectedNodeId(null); }}
                  className="btn"
                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444", padding: "8px", minHeight: "auto", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "12px", textAlign: "center", padding: "20px" }}>
              <span style={{ fontSize: "24px", marginBottom: "8px" }}>🧘</span>
              Select a topic node from the sequential map to configure its target time, subtopics, video links, and study notes.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
        <button onClick={onClose} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
          Cancel
        </button>
        <button onClick={handleSave} className="btn btn-gold" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px" }}>
          <Save size={16} /> Save Yatra Structure
        </button>
      </div>
    </div>
  );
}

// Standalone recursive component for rendering design nodes to prevent focus loss during renders
function DesignNode({ node, depth = 0, collapsedNodes, toggleCollapse, selectedNodeId, onSelect }) {
  const isCollapsed = collapsedNodes[node.id];
  const hasChildren = node.subtopics && node.subtopics.length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div style={{ marginLeft: depth > 0 ? "20px" : "0", borderLeft: depth > 0 ? "2px solid var(--border-color)" : "none", paddingLeft: depth > 0 ? "12px" : "0", marginBottom: "8px" }}>
      <div 
        onClick={() => onSelect(node.id)}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          background: isSelected ? "var(--accent-gold-glow)" : "var(--bg-secondary)",
          border: isSelected ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
          padding: "10px 12px",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }} 
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <div style={{ width: 14 }} />
        )}

        <div style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>
          {node.title || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Untitled Topic</span>}
        </div>

        {node.targetTime > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", color: "var(--text-muted)" }}>
            <span>⏱ {node.targetTime} min</span>
          </div>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div style={{ marginTop: "6px" }}>
          {node.subtopics.map(child => (
            <DesignNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              collapsedNodes={collapsedNodes}
              toggleCollapse={toggleCollapse}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
