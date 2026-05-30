import { useState, useEffect, useRef } from 'react'
import { BookOpen, Award, CheckCircle, HelpCircle, LogOut, Video, Send, Loader, ArrowRight, Play, ExternalLink } from 'lucide-react'
import './index.css'

const API_BASE = 'http://localhost:8080/api/v1'

function App() {
  const [user, setUser] = useState(null)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  
  // Log form states
  const [videoUrl, setVideoUrl] = useState('')
  const [userNotes, setUserNotes] = useState('')
  const [videoMetadata, setVideoMetadata] = useState(null)
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false)
  
  // Meditation states
  const [isMeditating, setIsMeditating] = useState(false)
  const [activeJournalId, setActiveJournalId] = useState(null)
  
  // History states
  const [journals, setJournals] = useState([])
  const [loadingJournals, setLoadingJournals] = useState(false)
  const [expandedJournalId, setExpandedJournalId] = useState(null)
  
  // Error/Success alerts
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const pollingRef = useRef(null)

  // Load user from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('gyanyatra_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        fetchUserProfile(parsed.id)
      } catch (e) {
        localStorage.removeItem('gyanyatra_user')
      }
    }
  }, [])

  // Poll for meditation completion
  useEffect(() => {
    if (isMeditating && activeJournalId && user) {
      pollingRef.current = setInterval(() => {
        pollJournalStatus(activeJournalId)
      }, 3000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [isMeditating, activeJournalId, user])

  // Fetch User Profile from Backend (to get latest Karma points)
  const fetchUserProfile = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/yatra/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        localStorage.setItem('gyanyatra_user', JSON.stringify(data))
        fetchSeekerJournals(userId)
      } else {
        localStorage.removeItem('gyanyatra_user')
        setUser(null)
      }
    } catch (e) {
      console.error("Error fetching user profile:", e)
    }
  }

  // Fetch Journals for the Seeker
  const fetchSeekerJournals = async (userId) => {
    setLoadingJournals(true)
    try {
      const res = await fetch(`${API_BASE}/yatra/journals/seeker/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setJournals(data || [])
      }
    } catch (e) {
      console.error("Error fetching seeker journals:", e)
    } finally {
      setLoadingJournals(false)
    }
  }

  // Poll Journal Status
  const pollJournalStatus = async (journalId) => {
    if (!user) return
    try {
      const res = await fetch(`${API_BASE}/yatra/journals/seeker/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setJournals(data || [])
        
        // Find the active journal
        const activeJournal = data.find(j => j.id === journalId)
        if (activeJournal && activeJournal.isVerified) {
          // Meditate finished!
          clearInterval(pollingRef.current)
          pollingRef.current = null
          setIsMeditating(false)
          setActiveJournalId(null)
          setVideoUrl('')
          setUserNotes('')
          setVideoMetadata(null)
          
          // Show details
          setExpandedJournalId(journalId)
          
          // Refresh user data (Karma points)
          fetchUserProfile(user.id)
          
          setSuccessMsg("Acharya's meditation is complete! Your Mastery Map and Karma Points have updated.")
          setTimeout(() => setSuccessMsg(''), 5000)
        }
      }
    } catch (e) {
      console.error("Error polling status:", e)
    }
  }

  // Register a new Seeker
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim()) return
    setErrorMsg('')
    
    try {
      const res = await fetch(`${API_BASE}/yatra/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail })
      })
      
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        localStorage.setItem('gyanyatra_user', JSON.stringify(data))
        fetchSeekerJournals(data.id)
      } else {
        setErrorMsg("Failed to register. Seeker might already exist or invalid input.")
      }
    } catch (err) {
      setErrorMsg("Connection to GyanYatra server failed.")
    }
  }

  // Extract YouTube ID locally as fallback
  const extractVideoIdLocally = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  // Load YouTube Video Metadata on URL paste/change
  const handleLoadMetadata = async (url) => {
    if (!url.trim()) return
    setVideoMetadata(null)
    setErrorMsg('')
    
    const localId = extractVideoIdLocally(url)
    if (!localId) {
      setErrorMsg("Please enter a valid YouTube URL.")
      return
    }

    setIsSearchingMetadata(true)
    try {
      const res = await fetch(`${API_BASE}/videos/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: url,
          includeStatistics: true,
          includeTopicDetails: true,
          includeThumbnails: true
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.metadata) {
          setVideoMetadata(data.metadata)
        } else {
          // Use local fallback if api returns success: false
          setVideoMetadata({
            videoId: localId,
            title: `Satsang: YouTube Video (${localId})`,
            channelTitle: "External Channel"
          })
        }
      } else {
        // Fallback for HTTP errors
        setVideoMetadata({
          videoId: localId,
          title: `Satsang: YouTube Video (${localId})`,
          channelTitle: "External Channel"
        })
      }
    } catch (e) {
      // Fallback for connection failure
      setVideoMetadata({
        videoId: localId,
        title: `Satsang: YouTube Video (${localId})`,
        channelTitle: "External Channel"
      })
    } finally {
      setIsSearchingMetadata(false)
    }
  }

  // Submit log to Acharya for Meditation
  const handleSubmitLog = async (e) => {
    e.preventDefault()
    if (!user || !videoUrl.trim() || !userNotes.trim()) return
    setErrorMsg('')
    setSuccessMsg('')
    
    try {
      // Step 1: Save the log draft
      const res = await fetch(`${API_BASE}/yatra/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          videoUrl: videoUrl,
          userNotes: userNotes
        })
      })

      if (res.ok) {
        const journal = await res.json()
        
        // Step 2: Queue for meditation
        const meditateRes = await fetch(`${API_BASE}/yatra/journals/${journal.id}/meditate`, {
          method: 'POST'
        })
        
        if (meditateRes.ok || meditateRes.status === 202) {
          setIsMeditating(true)
          setActiveJournalId(journal.id)
          // Add temporary pending item to journal list locally
          setJournals(prev => [
            {
              id: journal.id,
              userId: user.id,
              videoUrl: videoUrl,
              userNotes: userNotes,
              isVerified: false,
              createdAt: new Date().toISOString(),
              noteScore: 0
            },
            ...prev
          ])
        } else {
          setErrorMsg("Satsang logged, but failed to alert the Acharya for meditation.")
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        setErrorMsg(errData.message || "You have already logged this video in your Yatra.")
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.")
    }
  }

  // Logout / Switch Seeker
  const handleLogout = () => {
    localStorage.removeItem('gyanyatra_user')
    setUser(null)
    setJournals([])
    setVideoUrl('')
    setUserNotes('')
    setVideoMetadata(null)
    setIsMeditating(false)
    setActiveJournalId(null)
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
  }

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Registration view if user is null
  if (!user) {
    return (
      <div className="app-container registration-container">
        <div className="card registration-card text-center">
          <div className="logo-section mb-4" style={{ justifyContent: 'center' }}>
            <BookOpen size={40} className="logo-icon" />
            <div className="logo-text">
              <h1>GyanYatra</h1>
              <p>Path of Knowledge</p>
            </div>
          </div>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Welcome to the AI-powered learning dashboard. Register your Seeker profile to start logging your technical insights and receiving feedback from the Acharya.
          </p>
          
          {errorMsg && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'var(--color-danger)', color: '#fecaca', padding: '0.75rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          
          <form onSubmit={handleRegister} className="mt-4">
            <div className="form-group text-left" style={{ textAlign: 'left' }}>
              <label className="form-label">Seeker Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Ankit Sudegora"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>
            <div className="form-group text-left" style={{ textAlign: 'left' }}>
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="e.g. seeker@gyanyatra.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '1rem' }}>
              Begin Journey <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <BookOpen size={36} className="logo-icon" />
          <div className="logo-text">
            <h1>GyanYatra</h1>
            <p>Path of Knowledge</p>
          </div>
        </div>
        
        <div className="seeker-profile-badge">
          <div className="seeker-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="seeker-info">
            <span className="seeker-name">{user.name}</span>
            <span className="seeker-karma">
              <Award size={14} /> {user.totalKarmaPoints !== undefined ? user.totalKarmaPoints : 0} Karma
            </span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', minHeight: 'auto', borderRadius: '50px' }} title="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Form & Insights */}
        <div>
          {errorMsg && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-danger)', color: '#fecaca', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--color-success)', color: '#d1fae5', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              {successMsg}
            </div>
          )}

          {isMeditating ? (
            /* Meditation State Card */
            <div className="card meditation-view">
              <div className="meditation-outer-ring">
                <div className="meditation-breathing-ring"></div>
                <BookOpen size={24} className="meditation-icon" />
              </div>
              <h3>Acharya is Meditating</h3>
              <p>Evaluating your notes on code design, complexity bounds, and system architecture tradeoffs. The Sutra will update shortly.</p>
              <div className="meditation-quote">
                "Real knowledge is to know the extent of one's ignorance."
              </div>
            </div>
          ) : (
            /* Log Submission Form */
            <div className="card">
              <h2 className="card-title">
                <Video size={20} className="logo-icon" /> Log Technical Satsang
              </h2>
              <form onSubmit={handleSubmitLog}>
                <div className="form-group">
                  <label className="form-label">YouTube Video URL</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Paste link e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => handleLoadMetadata(videoUrl)}
                      disabled={isSearchingMetadata || !videoUrl}
                    >
                      {isSearchingMetadata ? <Loader size={16} className="spinner" /> : <Play size={16} />} Load
                    </button>
                  </div>
                </div>

                {videoMetadata && (
                  <div className="video-preview">
                    <div className="video-frame">
                      <iframe 
                        src={`https://www.youtube.com/embed/${videoMetadata.videoId}`}
                        title="YouTube video player" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="video-meta">
                      <div className="video-meta-title">{videoMetadata.title}</div>
                      <div className="video-meta-channel">{videoMetadata.channelTitle}</div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Wisdom Insights (Your Notes)</label>
                  <textarea 
                    className="form-input form-textarea" 
                    placeholder="Describe what you learned from this video. Write your notes here. You can use Hinglish. Focus on time complexity, trade-offs, architecture, and edge cases to score high Karma!"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-gold" style={{ width: '100%' }}>
                  Submit for Acharya Review <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: History / Yatra Map */}
        <div>
          <div className="card">
            <h2 className="card-title">
              <Award size={20} style={{ color: 'var(--accent-gold)' }} /> Seeker's Yatra Map
            </h2>
            
            {loadingJournals ? (
              <div className="loader-container">
                <div className="spinner"></div>
              </div>
            ) : journals.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} className="empty-state-icon" />
                <p>Your Yatra is empty. Log your first technical video to start scaling the Mastery Map.</p>
              </div>
            ) : (
              <div className="history-list">
                {journals.map((journal) => {
                  const isExpanded = expandedJournalId === journal.id
                  const videoId = extractVideoIdLocally(journal.videoUrl)
                  
                  return (
                    <div 
                      key={journal.id} 
                      className="history-item"
                      onClick={() => setExpandedJournalId(isExpanded ? null : journal.id)}
                    >
                      <div className="history-item-header">
                        <div>
                          <h4 className="history-item-title">
                            <Play size={12} style={{ color: 'var(--color-primary)' }} />
                            {journal.aiAnalysis ? `Topic: ${journal.aiAnalysis.identifiedConcepts?.[0] || 'System Design'}` : 'Technical Log'}
                          </h4>
                          <span className="history-item-date">{formatDate(journal.createdAt)}</span>
                        </div>
                        <div className={`history-item-score ${journal.isVerified ? '' : 'pending'}`}>
                          {journal.isVerified ? `+${journal.noteScore} Karma` : 'Meditating...'}
                        </div>
                      </div>
                      
                      <div className="history-item-notes">
                        {journal.userNotes}
                      </div>

                      {isExpanded && (
                        <div className="history-item-expanded" onClick={(e) => e.stopPropagation()}>
                          <div className="history-item-notes-full">
                            <strong>Your Insights:</strong><br />
                            {journal.userNotes}
                          </div>
                          
                          {journal.videoUrl && (
                            <div className="mb-4">
                              <a 
                                href={journal.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="trial-link"
                                style={{ width: 'fit-content' }}
                              >
                                View Source Video <ExternalLink size={14} />
                              </a>
                            </div>
                          )}

                          {journal.isVerified && journal.aiAnalysis ? (
                            <div className="card insight-card" style={{ margin: 0 }}>
                              <div className="score-badge-large">
                                <span className="score-value">{journal.aiAnalysis.score}</span>
                                <span className="score-label">Score</span>
                              </div>
                              
                              <div className="insight-section">
                                <span className="insight-section-title">Acharya Feedback</span>
                                <p className="insight-feedback">{journal.aiAnalysis.feedback}</p>
                              </div>

                              {journal.aiAnalysis.identifiedConcepts && journal.aiAnalysis.identifiedConcepts.length > 0 && (
                                <div className="insight-section">
                                  <span className="insight-section-title">Grasped Concepts</span>
                                  <div className="concepts-list">
                                    {journal.aiAnalysis.identifiedConcepts.map((concept, i) => (
                                      <span key={i} className="concept-tag">{concept}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {journal.aiAnalysis.gapSuggestions && journal.aiAnalysis.gapSuggestions.length > 0 && (
                                <div className="insight-section">
                                  <span className="insight-section-title">Gap Analysis</span>
                                  <ul className="gaps-list">
                                    {journal.aiAnalysis.gapSuggestions.map((gap, i) => (
                                      <li key={i} className="gap-item">{gap}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {journal.aiAnalysis.relevantTrials && journal.aiAnalysis.relevantTrials.length > 0 && (
                                <div className="insight-section">
                                  <span className="insight-section-title">Recommended Trials</span>
                                  <div className="trials-list">
                                    {journal.aiAnalysis.relevantTrials.map((trial, i) => {
                                      // Render a clean link or search query if it is not a direct URL
                                      const isUrl = trial.startsWith('http');
                                      const href = isUrl ? trial : `https://www.google.com/search?q=${encodeURIComponent(trial)}`;
                                      return (
                                        <a 
                                          key={i} 
                                          href={href} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="trial-link"
                                        >
                                          {trial} <ExternalLink size={12} />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-align-center" style={{ color: 'var(--color-info)', fontSize: '0.85rem' }}>
                              <Loader size={14} className="spinner" /> Acharya is currently meditating on these notes. Wait for evaluation...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
