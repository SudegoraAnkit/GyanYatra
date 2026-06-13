import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Save, X, BookOpen, Clock, ChevronDown, ChevronRight } from "lucide-react";

export default function YatraDesigner({ yatra, onSave, onClose }) {
  const [title, setTitle] = useState(yatra?.title || "");
  const [description, setDescription] = useState(yatra?.description || "");
  const [isPublic, setIsPublic] = useState(yatra?.isPublic ?? false);
  const [topics, setTopics] = useState(yatra?.topics || []);
  const [collapsedNodes, setCollapsedNodes] = useState({});

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

      {/* Curriculum Nodes Editor */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>Roadmap Structure</h3>
          <button onClick={() => addTopic(null)} className="btn btn-gold" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", minHeight: "auto", fontSize: 12 }}>
            <Plus size={14} /> Add Root Topic
          </button>
        </div>

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
                updateTopic={updateTopic}
                addTopic={addTopic}
                removeTopic={removeTopic}
              />
            ))}
          </div>
        )}
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
function DesignNode({ node, depth = 0, collapsedNodes, toggleCollapse, updateTopic, addTopic, removeTopic }) {
  const isCollapsed = collapsedNodes[node.id];
  const hasChildren = node.subtopics && node.subtopics.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? "24px" : "0", borderLeft: depth > 0 ? "1px dashed var(--border-color)" : "none", paddingLeft: depth > 0 ? "16px" : "0", marginBottom: "12px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
        {hasChildren ? (
          <button onClick={() => toggleCollapse(node.id)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : (
          <div style={{ width: 16 }} />
        )}

        <input
          type="text"
          placeholder="Topic Title (e.g. Master Replication)"
          value={node.title}
          onChange={(e) => updateTopic(node.id, { title: e.target.value })}
          style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4, fontSize: 13 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="number"
            placeholder="Min"
            value={node.targetTime}
            onChange={(e) => updateTopic(node.id, { targetTime: parseInt(e.target.value) || 0 })}
            style={{ width: 55, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "6px 8px", borderRadius: 4, fontSize: 12, textAlign: "center" }}
            title="Target study duration (minutes)"
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>min</span>
        </div>

        <button onClick={() => addTopic(node.id)} className="btn btn-secondary" style={{ padding: "6px 10px", minHeight: "auto", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }} title="Add subtopic">
          <Plus size={12} /> Subtopic
        </button>

        <button onClick={() => removeTopic(node.id)} style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }} title="Remove topic">
          <Trash2 size={15} />
        </button>
      </div>

      {hasChildren && !isCollapsed && (
        <div style={{ marginTop: "8px" }}>
          {node.subtopics.map(child => (
            <DesignNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              collapsedNodes={collapsedNodes}
              toggleCollapse={toggleCollapse}
              updateTopic={updateTopic}
              addTopic={addTopic}
              removeTopic={removeTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
}
