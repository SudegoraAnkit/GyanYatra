import { useState, useEffect, useRef } from 'react'
import { 
  BookOpen, Award, CheckCircle, HelpCircle, LogOut, Video, 
  Send, Loader, ArrowRight, Play, ExternalLink, Flame, 
  Music, Volume2, Sparkles, X, RefreshCw, Check, Clock, User 
} from 'lucide-react'
import './index.css'

const API_BASE = 'http://localhost:8080/api/v1'

function App() {
  // Seeker states
  const [user, setUser] = useState(null)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  
  // Log form states
  const [videoUrl, setVideoUrl] = useState('')
  const [userNotes, setUserNotes] = useState('')
  const [videoMetadata, setVideoMetadata] = useState(null)
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false)
  const [simulate, setSimulate] = useState(true) // defaults to true for free quota preservation
  
  // Meditation states
  const [isMeditating, setIsMeditating] = useState(false)
  const [activeJournalId, setActiveJournalId] = useState(null)
  
  // History / Yatra Map states
  const [journals, setJournals] = useState([])
  const [loadingJournals, setLoadingJournals] = useState(false)
  const [expandedJournalId, setExpandedJournalId] = useState(null)
  const [selectedConceptFilter, setSelectedConceptFilter] = useState(null)
  
  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  
  // Public Dashboard Modal states (dashboard for each user)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserJournals, setSelectedUserJournals] = useState([])
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Active Recall Quiz states
  const [lessonQuestionsMap, setLessonQuestionsMap] = useState({})
  const [loadingQuestionsMap, setLoadingQuestionsMap] = useState({})
  const [quizAnswers, setQuizAnswers] = useState({})
  const [submittingQuiz, setSubmittingQuiz] = useState({})
  const [completedQuizzes, setCompletedQuizzes] = useState(() => {
    const saved = localStorage.getItem('gyanyatra_completed_quizzes')
    return saved ? JSON.parse(saved) : {}
  })
  
  // Spaced Repetition states
  const [simulatedRecallDue, setSimulatedRecallDue] = useState(() => {
    const saved = localStorage.getItem('gyanyatra_recall_due')
    return saved ? JSON.parse(saved) : {}
  })
  const [recallAnswers, setRecallAnswers] = useState({})
  const [completedRecalls, setCompletedRecalls] = useState(() => {
    const saved = localStorage.getItem('gyanyatra_completed_recalls')
    return saved ? JSON.parse(saved) : {}
  })
  
  // Daily Streak state
  const [streak, setStreak] = useState(0)
  
  // Audio state (Web Audio API Synthesizer)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const audioCtxRef = useRef(null)
  const oscsRef = useRef([])

  // Error/Success alerts
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const pollingRef = useRef(null)

  // Load user from LocalStorage on mount
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

  // Fetch User Profile from Backend
  const fetchUserProfile = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/yatra/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        localStorage.setItem('gyanyatra_user', JSON.stringify(data))
        fetchSeekerJournals(userId)
        updateStreakCount(data.id)
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

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true)
    try {
      const res = await fetch(`${API_BASE}/yatra/users/leaderboard`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data || [])
      }
    } catch (e) {
      console.error("Error fetching leaderboard:", e)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  // Poll Journal Status (Async MQ Path)
  const pollJournalStatus = async (journalId) => {
    if (!user) return
    try {
      const res = await fetch(`${API_BASE}/yatra/journals/seeker/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setJournals(data || [])
        
        const activeJournal = data.find(j => j.id === journalId)
        if (activeJournal && activeJournal.isVerified) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          setIsMeditating(false)
          setActiveJournalId(null)
          
          setExpandedJournalId(journalId)
          
          // Refresh user data (Karma points)
          fetchUserProfile(user.id)
          fetchLeaderboard()
          
          // Update streaks
          recordStudyActivity(user.id)
          
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
        fetchLeaderboard()
        initializeStreak(data.id)
      } else {
        setErrorMsg("Failed to register. Seeker might already exist or invalid input.")
      }
    } catch (err) {
      setErrorMsg("Connection to GyanYatra server failed.")
    }
  }

  // Extract YouTube ID locally
  const extractVideoIdLocally = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  // Load YouTube Video Metadata
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
          setVideoMetadata({
            videoId: localId,
            title: `Satsang: YouTube Video (${localId})`,
            channelTitle: "External Channel"
          })
        }
      } else {
        setVideoMetadata({
          videoId: localId,
          title: `Satsang: YouTube Video (${localId})`,
          channelTitle: "External Channel"
        })
      }
    } catch (e) {
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
        
        // Step 2: Queue for meditation (simulate true or false)
        const meditateRes = await fetch(`${API_BASE}/yatra/journals/${journal.id}/meditate?simulate=${simulate}`, {
          method: 'POST'
        })
        
        if (simulate) {
          if (meditateRes.ok) {
            // Local simulation resolves instantly
            recordStudyActivity(user.id)
            
            // Re-fetch journals & profile immediately
            await fetchSeekerJournals(user.id)
            await fetchUserProfile(user.id)
            await fetchLeaderboard()
            
            setVideoUrl('')
            setUserNotes('')
            setVideoMetadata(null)
            setExpandedJournalId(journal.id)
            
            setSuccessMsg("Simulation complete! Your Wisdom Log was graded locally and scored instantly.")
            setTimeout(() => setSuccessMsg(''), 5000)
          } else {
            setErrorMsg("Satsang logged, but local simulation failed.")
          }
        } else {
          if (meditateRes.ok || meditateRes.status === 202) {
            setIsMeditating(true)
            setActiveJournalId(journal.id)
            // Add temporary pending item locally
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
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        setErrorMsg(errData.message || "You have already logged this video in your Yatra.")
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.")
    }
  }

  // Load Quick Starter Templates
  const handleLoadTemplate = (type) => {
    if (type === 'dsa') {
      const url = 'https://www.youtube.com/watch?v=CS50_Recursion'
      setVideoUrl(url)
      setUserNotes(`Recursion and Call Stacks:
- Recursion utilizes the Call Stack structure in memory. Every sub-problem pushes a frame.
- The base case is the halting condition, preventing Stack Overflow errors.
- Double-stack queue implementations have amortized time complexity O(1) but suffer memory bounds.
- Baar baar call stack overflow se bachne ke liye jagah optimize karni padti hai. Space complexity O(N).`)
      handleLoadMetadata(url)
    } else {
      const url = 'https://www.youtube.com/watch?v=Atomic_Habits_Review'
      setVideoUrl(url)
      setUserNotes(`Productivity Satsang: Habit Loops:
- Habit construction relies on the cue-routine-reward architecture.
- The 2-minute rule suggests scaling down new habits so they take under 2 minutes to start.
- Focus blocks and environmental control eliminate decision fatigue and protect focus.
- Rozana micro-habits perform karne se compound gains achieve hote hain. Bad habits ko delay karo.`)
      handleLoadMetadata(url)
    }
  }

  // Hinglish Glossary Item click
  const handleGlossaryClick = (englishTerm) => {
    setUserNotes(prev => prev + (prev.trim() ? " " : "") + englishTerm)
  }

  // Web Audio API Ambient Sound Deck (Zen Drone Oscillator)
  const toggleZenSounds = () => {
    if (isAudioPlaying) {
      // Stop
      if (oscsRef.current) {
        oscsRef.current.forEach(osc => {
          try { osc.stop() } catch(e){}
        })
        oscsRef.current = []
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close() } catch(e){}
        audioCtxRef.current = null
      }
      setIsAudioPlaying(false)
    } else {
      // Start
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        
        // Deep meditative drone chord: C2 (65.41Hz), G2 (98.00Hz), C3 (130.81Hz), E3 (164.81Hz)
        const freqs = [65.41, 98.00, 130.81, 164.81]
        const oscs = []
        
        // Master gain node
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(0.06, ctx.currentTime) // Soft volume
        masterGain.connect(ctx.destination)
        
        freqs.forEach(f => {
          const osc = ctx.createOscillator()
          const gainNode = ctx.createGain()
          
          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, ctx.currentTime)
          
          // Subtle modulation to make it feel natural
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
          
          osc.connect(gainNode)
          gainNode.connect(masterGain)
          
          osc.start()
          oscs.push(osc)
        })
        
        oscsRef.current = oscs
        setIsAudioPlaying(true)
      } catch (err) {
        console.error("Web Audio API failed to load", err)
      }
    }
  }

  // Handle active recall quiz loading and submitting
  const fetchLessonQuestions = async (url) => {
    if (lessonQuestionsMap[url] || loadingQuestionsMap[url]) return
    
    setLoadingQuestionsMap(prev => ({ ...prev, [url]: true }))
    try {
      const res = await fetch(`${API_BASE}/yatra/acharya/discover-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: url
      })
      if (res.ok) {
        const lessonData = await res.json()
        if (lessonData && lessonData.interviewQuestions) {
          setLessonQuestionsMap(prev => ({
            ...prev,
            [url]: lessonData.interviewQuestions
          }))
        }
      }
    } catch (e) {
      console.error("Error fetching lesson questions:", e)
    } finally {
      setLoadingQuestionsMap(prev => ({ ...prev, [url]: false }))
    }
  }

  // Trigger quiz questions loading on journal expand
  useEffect(() => {
    if (expandedJournalId) {
      const journal = journals.find(j => j.id === expandedJournalId)
      if (journal && journal.isVerified && journal.videoUrl) {
        fetchLessonQuestions(journal.videoUrl)
      }
    }
  }, [expandedJournalId, journals])

  const handleQuizAnswerChange = (journalId, qIndex, val) => {
    setQuizAnswers(prev => {
      const current = prev[journalId] ? [...prev[journalId]] : ['', '', '']
      current[qIndex] = val
      return { ...prev, [journalId]: current }
    })
  }

  const handleSubmitQuiz = async (journalId) => {
    const answers = quizAnswers[journalId] || ['', '', '']
    if (answers.some(ans => !ans.trim())) {
      alert("Please provide responses for all three questions.")
      return
    }
    
    setSubmittingQuiz(prev => ({ ...prev, [journalId]: true }))
    try {
      const res = await fetch(`${API_BASE}/yatra/journals/${journalId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers)
      })
      
      if (res.ok) {
        const updatedQuizzes = { ...completedQuizzes, [journalId]: true }
        setCompletedQuizzes(updatedQuizzes)
        localStorage.setItem('gyanyatra_completed_quizzes', JSON.stringify(updatedQuizzes))
        
        await fetchUserProfile(user.id)
        await fetchLeaderboard()
        
        setSuccessMsg("Self-study recall quiz graded! +15 Karma points added to your profile.")
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        alert("Failed to submit active recall quiz.")
      }
    } catch (err) {
      console.error("Error submitting quiz:", err)
    } finally {
      setSubmittingQuiz(prev => ({ ...prev, [journalId]: false }))
    }
  }

  // Spaced Repetition recall booster
  const handleTriggerRecallDue = (journalId) => {
    const updated = { ...simulatedRecallDue, [journalId]: true }
    setSimulatedRecallDue(updated)
    localStorage.setItem('gyanyatra_recall_due', JSON.stringify(updated))
  }

  const handleRecallAnswerChange = (journalId, val) => {
    setRecallAnswers(prev => ({ ...prev, [journalId]: val }))
  }

  const handleSubmitRecall = async (journalId) => {
    const answer = recallAnswers[journalId] || ''
    if (!answer.trim()) {
      alert("Please write down your recall review notes.")
      return
    }

    try {
      // Rewards +10 Karma points using quiz/submit as dynamic reward endpoint
      const res = await fetch(`${API_BASE}/yatra/journals/${journalId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([answer])
      })

      if (res.ok) {
        const updatedRecalls = { ...completedRecalls, [journalId]: "Memory consolidated successfully! High retrieval accuracy. Graded +10 Karma points." }
        setCompletedRecalls(updatedRecalls)
        localStorage.setItem('gyanyatra_completed_recalls', JSON.stringify(updatedRecalls))

        // Remove from due
        const updatedDue = { ...simulatedRecallDue }
        delete updatedDue[journalId]
        setSimulatedRecallDue(updatedDue)
        localStorage.setItem('gyanyatra_recall_due', JSON.stringify(updatedDue))

        await fetchUserProfile(user.id)
        await fetchLeaderboard()
        
        setSuccessMsg("Consolidation validated! +10 Karma points added.")
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        alert("Failed to submit recall consolidation.")
      }
    } catch (err) {
      console.error("Error submitting recall consolidation:", err)
    }
  }

  // Daily study streak calculators
  const initializeStreak = (userId) => {
    localStorage.setItem(`gyanyatra_streak_${userId}`, '1')
    localStorage.setItem(`gyanyatra_last_study_${userId}`, new Date().toISOString().split('T')[0])
    setStreak(1)
  }

  const updateStreakCount = (userId) => {
    const savedStreak = localStorage.getItem(`gyanyatra_streak_${userId}`)
    const lastDate = localStorage.getItem(`gyanyatra_last_study_${userId}`)
    const todayStr = new Date().toISOString().split('T')[0]
    
    if (!savedStreak) {
      setStreak(0)
      return
    }

    const currentStreak = parseInt(savedStreak, 10)
    if (lastDate === todayStr) {
      setStreak(currentStreak)
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      if (lastDate === yesterdayStr) {
        setStreak(currentStreak)
      } else {
        // Streak is broken
        setStreak(0)
        localStorage.setItem(`gyanyatra_streak_${userId}`, '0')
      }
    }
  }

  const recordStudyActivity = (userId) => {
    const todayStr = new Date().toISOString().split('T')[0]
    const lastDate = localStorage.getItem(`gyanyatra_last_study_${userId}`)
    const savedStreak = localStorage.getItem(`gyanyatra_streak_${userId}`) || '0'
    let currentStreak = parseInt(savedStreak, 10)

    if (lastDate !== todayStr) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastDate === yesterdayStr) {
        currentStreak += 1
      } else {
        currentStreak = 1
      }
      localStorage.setItem(`gyanyatra_streak_${userId}`, currentStreak.toString())
      localStorage.setItem(`gyanyatra_last_study_${userId}`, todayStr)
      setStreak(currentStreak)
    }
  }

  // Load user details/journals to view another user's dashboard
  const handleViewUserDashboard = async (userId) => {
    setLoadingSelectedUser(true)
    setIsModalOpen(true)
    setSelectedUser(null)
    setSelectedUserJournals([])
    
    try {
      const profileRes = await fetch(`${API_BASE}/yatra/users/${userId}`)
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setSelectedUser(profileData)
      }
      
      const journalsRes = await fetch(`${API_BASE}/yatra/journals/seeker/${userId}`)
      if (journalsRes.ok) {
        const journalsData = await journalsRes.json()
        setSelectedUserJournals(journalsData || [])
      }
    } catch (e) {
      console.error("Error fetching user portfolio:", e)
    } finally {
      setLoadingSelectedUser(false)
    }
  }

  // Aggregated grasped concepts list for active concept cloud
  const getGraspedConcepts = () => {
    const concepts = new Set()
    journals.forEach(j => {
      if (j.isVerified && j.aiAnalysis && j.aiAnalysis.identifiedConcepts) {
        j.aiAnalysis.identifiedConcepts.forEach(c => concepts.add(c))
      }
    })
    return Array.from(concepts)
  }

  // Filter journals based on clicked concept or search
  const filteredJournals = selectedConceptFilter 
    ? journals.filter(j => j.aiAnalysis && j.aiAnalysis.identifiedConcepts && j.aiAnalysis.identifiedConcepts.includes(selectedConceptFilter))
    : journals

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
    setStreak(0)
    if (isAudioPlaying) {
      toggleZenSounds()
    }
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

  // Registration View (Onboarding)
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
          
          {errorMsg && (
            <div className="card mb-4" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'var(--color-danger)', color: '#fecaca', padding: '0.75rem', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleRegister} className="mt-4">
            <div className="form-group text-left" style={{ textAlign: 'left' }}>
              <label className="form-label">Seeker Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Ankit Rai"
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
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Daily study streak */}
          <div className="streak-badge" title="Daily study streak! Log video notes daily to stack.">
            <Flame size={14} />
            <span>{streak} Day Streak</span>
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
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', minHeight: 'auto', borderRadius: '50px', marginLeft: '0.5rem' }} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Input Form, Glossary, Audio focus Deck */}
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

          {/* Sound focus deck */}
          <div className="audio-deck">
            <div className="audio-controls">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Music size={16} className="logo-icon" style={{ color: 'var(--color-primary)' }} />
                <span className="audio-title">Mindful Sitar focus Beat</span>
              </div>
              <button className="audio-play-btn" onClick={toggleZenSounds} title="Toggle ambient sounds to help you focus">
                {isAudioPlaying ? <Volume2 size={14} /> : <Play size={14} style={{ marginLeft: '1px' }} />}
              </button>
            </div>
          </div>

          {isMeditating ? (
            /* Meditation Ring (Queue state) */
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
            /* Submission Form */
            <div className="card">
              <h2 className="card-title">
                <Video size={20} className="logo-icon" /> Log Technical Satsang
              </h2>
              <form onSubmit={handleSubmitLog}>
                {/* Onboarding templates */}
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '0.25rem' }}>Quick Starter Templates</label>
                  <div className="templates-container">
                    <button type="button" className="btn-template" onClick={() => handleLoadTemplate('dsa')}>
                      <Sparkles size={12} /> Try DSA Notes (Technical)
                    </button>
                    <button type="button" className="btn-template" onClick={() => handleLoadTemplate('habits')}>
                      <Sparkles size={12} /> Try Habits Notes (Productivity)
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
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

                {/* Simulator Mode Toggle */}
                <div className="simulator-mode-container">
                  <label className="simulator-checkbox-label">
                    <input 
                      type="checkbox" 
                      className="simulator-checkbox"
                      checked={simulate}
                      onChange={(e) => setSimulate(e.target.checked)}
                    />
                    <span>Preserve Free AI Quota (Simulator Mode)</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-gold" style={{ width: '100%' }}>
                  Submit for Acharya Review <Send size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Hinglish Translation Glossary */}
          <div className="card glossary-card">
            <h3 className="card-title" style={{ fontSize: '1rem', border: 'none', padding: '0', marginBottom: '0.75rem' }}>
              <HelpCircle size={16} className="logo-icon" /> Hinglish translation helper
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Mix Hinglish in your reflections! Click a card below to automatically append the technical equivalent to your notes.
            </p>
            <div className="glossary-grid">
              <div className="glossary-item" onClick={() => handleGlossaryClick("Recursion / Call stack Loop")}>
                <span className="glossary-hinglish">"baar baar call"</span>
                <span className="glossary-english">Recursion / Loop</span>
              </div>
              <div className="glossary-item" onClick={() => handleGlossaryClick("Space Complexity memory bounds")}>
                <span className="glossary-hinglish">"jagah / memory space"</span>
                <span className="glossary-english">Space Complexity</span>
              </div>
              <div className="glossary-item" onClick={() => handleGlossaryClick("Time Complexity bounds")}>
                <span className="glossary-hinglish">"samay / speed bounds"</span>
                <span className="glossary-english">Time Complexity</span>
              </div>
              <div className="glossary-item" onClick={() => handleGlossaryClick("Divide & Conquer algorithm")}>
                <span className="glossary-hinglish">"aadha aadha break"</span>
                <span className="glossary-english">Divide & Conquer</span>
              </div>
              <div className="glossary-item" onClick={() => handleGlossaryClick("Micro-habit / 2-minute rule")}>
                <span className="glossary-hinglish">"chota-mota habit"</span>
                <span className="glossary-english">Micro-habit</span>
              </div>
              <div className="glossary-item" onClick={() => handleGlossaryClick("Habit stacking loops")}>
                <span className="glossary-hinglish">"ek ke baad ek"</span>
                <span className="glossary-english">Habit stacking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mastery portfolio, Leaderboard, Yatra Map history */}
        <div>
          {/* Portfolio Mastery cloud */}
          <div className="card">
            <h2 className="card-title">
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} /> Seeker's Mastery Portfolio
            </h2>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Your Grasped Concepts:
              </div>
              {getGraspedConcepts().length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No concepts unlocked yet. Submit reflections to discover.</div>
              ) : (
                <div className="concept-cloud-container">
                  {getGraspedConcepts().map((concept, i) => (
                    <span 
                      key={i} 
                      className={`concept-cloud-tag ${selectedConceptFilter === concept ? 'active' : ''}`}
                      onClick={() => setSelectedConceptFilter(prev => prev === concept ? null : concept)}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              )}
              {selectedConceptFilter && (
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', minHeight: 'auto', marginTop: '0.5rem' }}
                  onClick={() => setSelectedConceptFilter(null)}
                >
                  Clear Filter: {selectedConceptFilter}
                </button>
              )}
            </div>
          </div>

          {/* Seeker Leaderboards */}
          <div className="card leaderboard-widget">
            <div className="flex-between">
              <h2 className="card-title" style={{ border: 'none', padding: '0', margin: '0' }}>
                <Award size={20} style={{ color: 'var(--accent-gold)' }} /> Seeker Guilds Leaderboard
              </h2>
              <button 
                onClick={fetchLeaderboard} 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                disabled={loadingLeaderboard}
                title="Refresh Leaderboard"
              >
                <RefreshCw size={12} className={loadingLeaderboard ? 'spinner' : ''} />
              </button>
            </div>
            
            {loadingLeaderboard && leaderboard.length === 0 ? (
              <div className="loader-container"><div className="spinner"></div></div>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.slice(0, 5).map((u, idx) => (
                  <div 
                    key={u.id} 
                    className="leaderboard-item"
                    onClick={() => handleViewUserDashboard(u.id)}
                    title={`Click to view ${u.name}'s verified learning portfolio`}
                  >
                    <div className="leaderboard-left">
                      <span className={`leaderboard-rank rank-${idx + 1}`}>
                        {idx + 1}
                      </span>
                      <span className="leaderboard-name">{u.name} {u.id === user.id ? "(You)" : ""}</span>
                    </div>
                    <span className="leaderboard-karma">{u.totalKarmaPoints || 0} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent reflections map */}
          <div className="card">
            <h2 className="card-title">
              <Clock size={20} style={{ color: 'var(--color-info)' }} /> Seeker's Yatra Map
            </h2>
            
            {loadingJournals ? (
              <div className="loader-container">
                <div className="spinner"></div>
              </div>
            ) : filteredJournals.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} className="empty-state-icon" />
                <p>
                  {selectedConceptFilter 
                    ? "No logs found for this concept filter." 
                    : "Your Yatra is empty. Log your first technical video to start scaling the Mastery Map."}
                </p>
              </div>
            ) : (
              <div className="history-list">
                {filteredJournals.map((journal) => {
                  const isExpanded = expandedJournalId === journal.id
                  const questions = lessonQuestionsMap[journal.videoUrl] || null
                  const loadingQuestions = loadingQuestionsMap[journal.videoUrl] || false
                  
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
                            <div className="mb-4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <a 
                                href={journal.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="trial-link"
                                style={{ width: 'fit-content', padding: '0.35rem 0.6rem' }}
                              >
                                View Source Video <ExternalLink size={14} />
                              </a>
                              
                              {/* Spaced repetition fast forward simulator */}
                              {journal.isVerified && !simulatedRecallDue[journal.id] && !completedRecalls[journal.id] && (
                                <button 
                                  className="btn-template"
                                  onClick={() => handleTriggerRecallDue(journal.id)}
                                  title="Simulate 24h pass to trigger spaced repetition revision"
                                >
                                  Simulate 24h Pass (Recall)
                                </button>
                              )}
                            </div>
                          )}

                          {/* Spaced repetition revision section */}
                          {simulatedRecallDue[journal.id] && (
                            <div className="recall-booster-container">
                              <div className="recall-badge-due">Recall consolidation due</div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                <strong>Active Recall exercise</strong>: Write your notes again from memory without looking at your previous summary!
                              </p>
                              <textarea
                                className="quiz-answer-input"
                                rows={3}
                                placeholder="Write what you remember from this topic..."
                                value={recallAnswers[journal.id] || ''}
                                onChange={(e) => handleRecallAnswerChange(journal.id, e.target.value)}
                              />
                              <button 
                                className="btn btn-gold" 
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', minHeight: 'auto', marginTop: '0.5rem' }}
                                onClick={() => handleSubmitRecall(journal.id)}
                              >
                                Verify Consolidation (+10 Karma)
                              </button>
                            </div>
                          )}

                          {completedRecalls[journal.id] && (
                            <div className="consolidation-result">
                              {completedRecalls[journal.id]}
                            </div>
                          )}

                          {journal.isVerified && journal.aiAnalysis ? (
                            <div>
                              <div className="card insight-card" style={{ margin: 0, position: 'relative' }}>
                                <div className="score-badge-large">
                                  <span className="score-value">{journal.aiAnalysis.score}</span>
                                  <span className="score-label">Score</span>
                                </div>
                                
                                <div className="insight-section">
                                  <span className="insight-section-title">Acharya Feedback</span>
                                  <p className="insight-feedback" style={{ fontSize: '0.85rem' }}>{journal.aiAnalysis.feedback}</p>
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

                              {/* Interactive active recall quiz */}
                              <div className="quiz-section">
                                <h4 className="insight-section-title" style={{ color: 'var(--accent-gold)' }}>
                                  <Award size={14} /> Active Recall Quiz (+15 Karma points)
                                </h4>
                                
                                {completedQuizzes[journal.id] ? (
                                  <div className="quiz-completed-badge" style={{ marginTop: '0.5rem' }}>
                                    <CheckCircle size={12} /> Active Recall Quiz Completed (+15 Karma)
                                  </div>
                                ) : loadingQuestions ? (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}><Loader size={12} className="spinner" /> Generating active recall questions...</div>
                                ) : questions ? (
                                  <div>
                                    {questions.map((q, idx) => (
                                      <div key={idx} className="quiz-question-box">
                                        <div className="quiz-question-text">Q{idx+1}: {q}</div>
                                        <textarea 
                                          className="quiz-answer-input"
                                          rows={2}
                                          placeholder="Type your brief explanation..."
                                          value={(quizAnswers[journal.id] || ['', '', ''])[idx]}
                                          onChange={(e) => handleQuizAnswerChange(journal.id, idx, e.target.value)}
                                        />
                                      </div>
                                    ))}
                                    <button 
                                      className="btn btn-primary"
                                      style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', minHeight: 'auto', marginTop: '0.25rem' }}
                                      onClick={() => handleSubmitQuiz(journal.id)}
                                      disabled={submittingQuiz[journal.id]}
                                    >
                                      {submittingQuiz[journal.id] ? <Loader size={12} className="spinner" /> : <Check size={12} />} Submit Quiz Answers
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quiz questions not available for this satsang.</div>
                                )}
                              </div>
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

      {/* Overlay Modal for public user dashboards */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            
            {loadingSelectedUser ? (
              <div className="loader-container" style={{ padding: '4rem' }}><div className="spinner"></div></div>
            ) : selectedUser ? (
              <>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="seeker-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                      {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                        {selectedUser.name}'s Seeker Portfolio
                      </h2>
                      <span className="seeker-karma" style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>
                        <Award size={16} /> {selectedUser.totalKarmaPoints || 0} Karma Points
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="modal-body">
                  {/* Grasped Concepts */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 className="insight-section-title">Verified Concepts Cloud</h3>
                    <div className="concept-cloud-container" style={{ marginTop: '0.5rem' }}>
                      {Array.from(new Set(
                        selectedUserJournals
                          .filter(j => j.isVerified && j.aiAnalysis && j.aiAnalysis.identifiedConcepts)
                          .flatMap(j => j.aiAnalysis.identifiedConcepts)
                      )).length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No concepts unlocked yet.</span>
                      ) : (
                        Array.from(new Set(
                          selectedUserJournals
                            .filter(j => j.isVerified && j.aiAnalysis && j.aiAnalysis.identifiedConcepts)
                            .flatMap(j => j.aiAnalysis.identifiedConcepts)
                        )).map((concept, i) => (
                          <span key={i} className="concept-tag" style={{ background: 'var(--color-primary-glow)', borderColor: 'var(--color-primary)', color: '#c7d2fe' }}>
                            {concept}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Learning logs history */}
                  <div>
                    <h3 className="insight-section-title">Yatra History Map ({selectedUserJournals.length} Satsangs)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {selectedUserJournals.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This seeker's Yatra is currently empty.</div>
                      ) : (
                        selectedUserJournals.map(j => (
                          <div key={j.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem' }}>
                            <div className="flex-between">
                              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {j.aiAnalysis ? `Topic: ${j.aiAnalysis.identifiedConcepts?.[0] || 'System Design'}` : 'Technical Log'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: '700' }}>
                                +{j.noteScore || 0} Karma
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Logged on {formatDate(j.createdAt)}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                              "{j.userNotes}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Failed to load seeker portfolio.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
