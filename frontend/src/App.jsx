import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  BookOpen, Award, CheckCircle, HelpCircle, LogOut, Video, 
  Send, Loader, ArrowRight, Play, ExternalLink, Flame, 
  Music, Volume2, Sparkles, X, RefreshCw, Check, Clock, User,
  Edit2, Lock, Sun, Moon
} from 'lucide-react'
import './index.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1'

const getLocalYMD = (dateInput) => {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ==========================================================================
// DYNAMIC STREAK CALCULATIONS
// ==========================================================================
const calculateStreaks = (userJournals) => {
  if (!userJournals || userJournals.length === 0) {
    return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
  }

  // Extract unique dates formatted as YYYY-MM-DD
  const dates = Array.from(new Set(
    userJournals.map(j => getLocalYMD(j.createdAt))
  )).filter(Boolean).sort((a, b) => new Date(b) - new Date(a)); // descending (newest first)

  if (dates.length === 0) {
    return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
  }

  const todayStr = getLocalYMD(new Date());
  const yesterdayStr = getLocalYMD(new Date(Date.now() - 86400000));

  // 1. Daily Streak
  let daily = 0;
  let hasToday = dates.includes(todayStr);
  let hasYesterday = dates.includes(yesterdayStr);

  if (hasToday || hasYesterday) {
    let current = hasToday ? todayStr : yesterdayStr;
    daily = 1;
    let nextIndex = dates.indexOf(current) + 1;
    let checkDate = new Date(current);

    while (nextIndex < dates.length) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalYMD(checkDate);
      if (dates.includes(checkStr)) {
        daily++;
        nextIndex = dates.indexOf(checkStr) + 1;
      } else {
        break;
      }
    }
  }

  // Helper for ISO week identifier: YYYY-Www
  const getWeekId = (dateObj) => {
    const d = new Date(dateObj);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // Thursday of the week
    const yearStart = new Date(d.getFullYear(),0,1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  // 2. Weekly Streak
  const weeks = Array.from(new Set(
    userJournals.map(j => getWeekId(new Date(j.createdAt)))
  )).sort((a, b) => b.localeCompare(a));

  let weekly = 0;
  const currentWeek = getWeekId(new Date());
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = getWeekId(lastWeekDate);

  if (weeks.includes(currentWeek) || weeks.includes(lastWeek)) {
    let currentW = weeks.includes(currentWeek) ? currentWeek : lastWeek;
    weekly = 1;
    let [year, weekNum] = currentW.split('-W').map(Number);
    let checkWNum = weekNum;
    let checkYear = year;

    while (true) {
      checkWNum--;
      if (checkWNum === 0) {
        checkYear--;
        const dec31 = new Date(checkYear, 11, 31);
        const prevWeekId = getWeekId(dec31);
        checkWNum = Number(prevWeekId.split('-W')[1]);
      }
      const checkWId = `${checkYear}-W${String(checkWNum).padStart(2, '0')}`;
      if (weeks.includes(checkWId)) {
        weekly++;
      } else {
        break;
      }
    }
  }

  // 3. Monthly Streak
  const months = Array.from(new Set(
    userJournals.map(j => {
      const d = new Date(j.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort((a, b) => b.localeCompare(a));

  let monthly = 0;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  if (months.includes(currentMonth) || months.includes(lastMonth)) {
    let currentM = months.includes(currentMonth) ? currentMonth : lastMonth;
    monthly = 1;
    let [year, monthNum] = currentM.split('-').map(Number);
    let checkMNum = monthNum;
    let checkYear = year;

    while (true) {
      checkMNum--;
      if (checkMNum === 0) {
        checkMNum = 12;
        checkYear--;
      }
      const checkMId = `${checkYear}-${String(checkMNum).padStart(2, '0')}`;
      if (months.includes(checkMId)) {
        monthly++;
      } else {
        break;
      }
    }
  }

  // 4. Yearly Streak
  const years = Array.from(new Set(
    userJournals.map(j => new Date(j.createdAt).getFullYear().toString())
  )).sort((a, b) => Number(b) - Number(a));

  let yearly = 0;
  const currentYear = new Date().getFullYear().toString();
  const lastYear = (new Date().getFullYear() - 1).toString();

  if (years.includes(currentYear) || years.includes(lastYear)) {
    let currentY = years.includes(currentYear) ? currentYear : lastYear;
    yearly = 1;
    let checkYear = Number(currentY);

    while (true) {
      checkYear--;
      const checkYStr = checkYear.toString();
      if (years.includes(checkYStr)) {
        yearly++;
      } else {
        break;
      }
    }
  }

  return { daily, weekly, monthly, yearly };
};

// ==========================================================================
// TOPIC & CATEGORY STATISTICS HELPER
// ==========================================================================
const getCategoryStats = (journals) => {
  let totalTopics = 0;
  let techCount = 0;
  let growthCount = 0;
  const techTopics = new Set();
  const growthTopics = new Set();

  journals.forEach(j => {
    if (j.isVerified) {
      totalTopics++;
      const concepts = j.aiAnalysis?.identifiedConcepts || [];
      const notes = (j.userNotes || "").toLowerCase();

      const isGrowth = concepts.some(c => 
        ["Personal Productivity", "Habit Architecture", "The 2-Minute Rule", "Time Management", "Habit Stacking", "Cognitive Focus"].includes(c)
      ) || notes.includes("habit") || notes.includes("productivity") || notes.includes("focus") || notes.includes("mindset");

      const topicName = j.aiAnalysis?.identifiedConcepts?.[0] || "System Design";

      if (isGrowth) {
        growthCount++;
        growthTopics.add(topicName);
      } else {
        techCount++;
        techTopics.add(topicName);
      }
    }
  });

  return {
    total: totalTopics,
    tech: {
      count: techCount,
      uniqueTopics: Array.from(techTopics)
    },
    growth: {
      count: growthCount,
      uniqueTopics: Array.from(growthTopics)
    }
  };
};

// ==========================================================================
// GITHUB-STYLE CONTRIBUTION HEATMAP COMPONENT
// ==========================================================================
function ContributionHeatmap({ journals }) {
  const activityMap = {};
  journals.forEach(j => {
    if (j.createdAt) {
      const dStr = getLocalYMD(j.createdAt);
      activityMap[dStr] = (activityMap[dStr] || 0) + 1;
    }
  });

  const today = new Date();
  const cells = [];
  
  // Start 364 days ago
  const startDate = new Date();
  startDate.setDate(today.getDate() - 364);
  // Align to Sunday
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  const checkDate = new Date(startDate);
  checkDate.setHours(0,0,0,0);
  const endCompareDate = new Date(today);
  endCompareDate.setHours(23,59,59,999);

  while (checkDate <= endCompareDate) {
    const dStr = getLocalYMD(checkDate);
    const count = activityMap[dStr] || 0;
    cells.push({
      dateStr: dStr,
      count: count,
      dayOfWeek: checkDate.getDay(),
      month: checkDate.getMonth()
    });
    checkDate.setDate(checkDate.getDate() + 1);
  }

  // Group cells by week (columns of 7 days)
  const columns = [];
  let currentWeek = [];
  cells.forEach(cell => {
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      columns.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    columns.push(currentWeek);
  }

  // Generate month labels
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthLabels = [];
  let lastMonth = -1;
  columns.forEach((week, wIdx) => {
    const firstDay = week[0];
    if (firstDay && firstDay.month !== lastMonth) {
      monthLabels.push({ text: monthNames[firstDay.month], index: wIdx });
      lastMonth = firstDay.month;
    }
  });

  return (
    <div className="heatmap-container" onClick={(e) => e.stopPropagation()}>
      <div className="heatmap-months">
        {monthLabels.map((lbl, idx) => (
          <span 
            key={idx} 
            className="heatmap-month-label" 
            style={{ gridColumnStart: lbl.index + 2 }}
          >
            {lbl.text}
          </span>
        ))}
      </div>
      <div className="heatmap-body">
        <div className="heatmap-days">
          <span className="heatmap-day-label">Mon</span>
          <span className="heatmap-day-label">Wed</span>
          <span className="heatmap-day-label">Fri</span>
        </div>
        <div className="heatmap-grid-scroll">
          <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${columns.length}, 10px)` }}>
            {columns.map((week, wIdx) => (
              <div key={wIdx} className="heatmap-week-column">
                {week.map((day, dIdx) => {
                  let intensity = 0;
                  if (day.count > 0) {
                    if (day.count === 1) intensity = 1;
                    else if (day.count === 2) intensity = 2;
                    else if (day.count === 3) intensity = 3;
                    else intensity = 4;
                  }
                  return (
                    <div 
                      key={dIdx} 
                      className={`heatmap-cell intensity-${intensity}`} 
                      title={`${day.count} satsangs logged on ${day.dateStr}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="heatmap-cell intensity-0"></div>
        <div className="heatmap-cell intensity-1"></div>
        <div className="heatmap-cell intensity-2"></div>
        <div className="heatmap-cell intensity-3"></div>
        <div className="heatmap-cell intensity-4"></div>
        <span>More</span>
      </div>
    </div>
  );
}

// ==========================================================================
// PREVENT OVERLAY SURF LOADER
// ==========================================================================
function SurfingLoader({ message }) {
  return (
    <div className="surfing-loader-overlay">
      <div className="surfing-loader-content">
        <div className="surfing-ocean">
          <div className="surfing-wave"></div>
          <div className="surfing-board">
            <Sparkles className="surfing-sparkle" size={24} />
          </div>
        </div>
        <h2 className="surfing-title">Surfing the GyanYatra</h2>
        <p className="surfing-subtitle">{message || "Navigating the ocean of knowledge..."}</p>
        <div className="surfing-quote">
          "ज्ञानं परमं भूषणम्" <br />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Knowledge is the supreme ornament</span>
        </div>
      </div>
    </div>
  )
}

// ==========================================================================
// MAIN REACT COMPONENT
// ==========================================================================
function App() {
  // Seeker states
  const [user, setUser] = useState(null)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  
  // OTP Auth States
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [receivedOtp, setReceivedOtp] = useState('') // For simulated notification display
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('gyanyatra_theme') || 'dark')
  
  // Portfolio Customize states
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editSkills, setEditSkills] = useState([])
  const [newSkillInput, setNewSkillInput] = useState('')
  
  // Purpose reveal state
  const [showPurposeModal, setShowPurposeModal] = useState(false)
  
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
  
  // Daily Streak State
  const [streak, setStreak] = useState(0)
  const [showStreakDetails, setShowStreakDetails] = useState(false)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [activeStreakTab, setActiveStreakTab] = useState('month')
  
  // Audio state (Web Audio API Synthesizer)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const audioCtxRef = useRef(null)
  const oscsRef = useRef([])

  // Error/Success alerts
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const pollingRef = useRef(null)

  // Compute live streaks & category stats
  const streaks = useMemo(() => calculateStreaks(journals), [journals])
  const categoryStats = useMemo(() => getCategoryStats(journals), [journals])

  // Load user from LocalStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('gyanyatra_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        fetchUserProfile(parsed.id, parsed.token)
      } catch (e) {
        localStorage.removeItem('gyanyatra_user')
      }
    }
  }, [])

  // Sync theme with document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gyanyatra_theme', theme)
  }, [theme])

  // OTP Cooldown Countdown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => {
        setOtpCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCooldown])

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

  // Fetch User Profile from Backend (Includes authorization headers)
  const fetchUserProfile = async (userId, customToken = null) => {
    const savedUser = JSON.parse(localStorage.getItem('gyanyatra_user') || '{}')
    const token = customToken || savedUser?.token

    try {
      const res = await fetch(`${API_BASE}/yatra/users/${userId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
      if (res.ok) {
        const data = await res.json()
        // Maintain token in state/storage
        const updatedUser = { ...data, token: token }
        setUser(updatedUser)
        
        // Load portfolio edit states
        setEditName(data.name || '')
        setEditBio(data.bio || 'Passionate Seeker on the GyanYatra.')
        setEditSkills(data.additionalSkills || [])
        
        localStorage.setItem('gyanyatra_user', JSON.stringify(updatedUser))
        fetchSeekerJournals(userId, token)
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
  const fetchSeekerJournals = async (userId, customToken = null) => {
    const savedUser = JSON.parse(localStorage.getItem('gyanyatra_user') || '{}')
    const token = customToken || savedUser?.token
    setLoadingJournals(true)

    try {
      const res = await fetch(`${API_BASE}/yatra/journals/seeker/${userId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
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

  // Fetch Leaderboard (Public Endpoint, no token needed)
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

  // Poll Journal Status (Requires authorization)
  const pollJournalStatus = async (journalId) => {
    if (!user) return
    try {
      const res = await fetch(`${API_BASE}/yatra/journals/seeker/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
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
          
          // Refresh user data
          fetchUserProfile(user.id, user.token)
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

  // Initiate OTP Login/Registration Request (Public Endpoint)
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!regEmail.trim()) return
    if (otpCooldown > 0) {
      setErrorMsg(`Please wait ${otpCooldown} seconds before requesting a new security code.`)
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setIsGeneratingOtp(true)
    
    try {
      const res = await fetch(`${API_BASE}/yatra/users/login/otp/generate?email=${encodeURIComponent(regEmail)}`, {
        method: 'POST'
      })
      
      if (res.ok) {
        setOtpSent(true)
        setOtpCooldown(60)
        setSuccessMsg("OTP security code successfully dispatched. Please check your email inbox (and developer console logs if running locally).")
      } else {
        const errData = await res.json().catch(() => ({}))
        setErrorMsg(errData.error || "Failed to request OTP. Ensure your email is correct.")
      }
    } catch (err) {
      setErrorMsg("Connection to GyanYatra server failed. Make sure backend is running.")
    } finally {
      setIsGeneratingOtp(false)
    }
  }

  // Verify OTP and Complete Login (Public Endpoint, issues JWT)
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const trimmedOtp = otpCode.trim()
    if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      setErrorMsg("Please enter a valid 6-digit numeric security code.")
      return
    }
    setErrorMsg('')
    setIsVerifyingOtp(true)
    
    try {
      const res = await fetch(`${API_BASE}/yatra/users/login/otp/verify?email=${encodeURIComponent(regEmail)}&otp=${encodeURIComponent(trimmedOtp)}&name=${encodeURIComponent(regName)}`, {
        method: 'POST'
      })
      
      if (res.ok) {
        const data = await res.json() // Contains User object + JWT in token field
        setUser(data)
        setEditName(data.name || '')
        setEditBio(data.bio || 'Passionate Seeker on the GyanYatra.')
        setEditSkills(data.additionalSkills || [])
        
        localStorage.setItem('gyanyatra_user', JSON.stringify(data))
        fetchSeekerJournals(data.id, data.token)
        fetchLeaderboard()
        initializeStreak(data.id)
        
        // Clean temporary states
        setOtpSent(false)
        setOtpCode('')
        setReceivedOtp('')
        setSuccessMsg("Validated successfully! Welcome to GyanYatra.")
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        const errData = await res.json().catch(() => ({}))
        setErrorMsg(errData.error || "Verification failed. The security code is incorrect or expired.")
      }
    } catch (err) {
      setErrorMsg("Connection failed during verification.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Save customized user portfolio (Requires JWT)
  const handleSavePortfolio = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    setErrorMsg('')
    setSuccessMsg('')
    
    try {
      const res = await fetch(`${API_BASE}/yatra/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: editName,
          bio: editBio,
          additionalSkills: editSkills
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const updatedUser = { ...data, token: user.token }
        setUser(updatedUser)
        localStorage.setItem('gyanyatra_user', JSON.stringify(updatedUser))
        setIsEditingPortfolio(false)
        setSuccessMsg("Portfolio profile saved successfully!")
        setTimeout(() => setSuccessMsg(''), 5000)
        fetchLeaderboard()
      } else {
        setErrorMsg("Failed to save portfolio changes.")
      }
    } catch (err) {
      setErrorMsg("Connection failure updating profile.")
    }
  }

  const handleAddSkill = (e) => {
    e.preventDefault()
    if (!newSkillInput.trim()) return
    const skill = newSkillInput.trim()
    if (!editSkills.includes(skill)) {
      setEditSkills(prev => [...prev, skill])
    }
    setNewSkillInput('')
  }

  const handleRemoveSkill = (skillToRemove) => {
    setEditSkills(prev => prev.filter(s => s !== skillToRemove))
  }

  // Extract YouTube ID locally
  const extractVideoIdLocally = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  // Load YouTube Video Metadata (Requires JWT)
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
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

  // Submit log to Acharya for Meditation (Requires JWT)
  const handleSubmitLog = async (e) => {
    e.preventDefault()
    if (!user || !videoUrl.trim() || !userNotes.trim()) return
    setErrorMsg('')
    setSuccessMsg('')
    setIsSubmittingJournal(true)
    
    try {
      const res = await fetch(`${API_BASE}/yatra/journals`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.id,
          videoUrl: videoUrl,
          userNotes: userNotes
        })
      })

      if (res.ok) {
        const journal = await res.json()
        
        // Step 2: Queue for meditation
        const meditateRes = await fetch(`${API_BASE}/yatra/journals/${journal.id}/meditate?simulate=${simulate}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        })
        
        if (simulate) {
          if (meditateRes.ok) {
            // Local simulation resolves instantly
            recordStudyActivity(user.id)
            
            // Re-fetch journals & profile immediately
            await fetchSeekerJournals(user.id, user.token)
            await fetchUserProfile(user.id, user.token)
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
    } finally {
      setIsSubmittingJournal(false)
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

  // Handle active recall quiz loading (Requires JWT)
  const fetchLessonQuestions = async (url) => {
    if (lessonQuestionsMap[url] || loadingQuestionsMap[url]) return
    
    setLoadingQuestionsMap(prev => ({ ...prev, [url]: true }))
    try {
      const res = await fetch(`${API_BASE}/yatra/acharya/discover-topic`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${user.token}`
        },
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

  // Submit active recall quiz answers (Requires JWT)
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(answers)
      })
      
      if (res.ok) {
        const updatedQuizzes = { ...completedQuizzes, [journalId]: true }
        setCompletedQuizzes(updatedQuizzes)
        localStorage.setItem('gyanyatra_completed_quizzes', JSON.stringify(updatedQuizzes))
        
        await fetchUserProfile(user.id, user.token)
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

  // Submit recall answers (Requires JWT)
  const handleSubmitRecall = async (journalId) => {
    const answer = recallAnswers[journalId] || ''
    if (!answer.trim()) {
      alert("Please write down your recall review notes.")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/yatra/journals/${journalId}/quiz/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
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

        await fetchUserProfile(user.id, user.token)
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
    localStorage.setItem(`gyanyatra_last_study_${userId}`, getLocalYMD(new Date()))
    setStreak(1)
  }

  const updateStreakCount = (userId) => {
    const savedStreak = localStorage.getItem(`gyanyatra_streak_${userId}`)
    const lastDate = localStorage.getItem(`gyanyatra_last_study_${userId}`)
    const todayStr = getLocalYMD(new Date())
    
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
      const yesterdayStr = getLocalYMD(yesterday)
      
      if (lastDate === yesterdayStr) {
        setStreak(currentStreak)
      } else {
        setStreak(0)
        localStorage.setItem(`gyanyatra_streak_${userId}`, '0')
      }
    }
  }

  const recordStudyActivity = (userId) => {
    const todayStr = getLocalYMD(new Date())
    const lastDate = localStorage.getItem(`gyanyatra_last_study_${userId}`)
    const savedStreak = localStorage.getItem(`gyanyatra_streak_${userId}`) || '0'
    let currentStreak = parseInt(savedStreak, 10)

    if (lastDate !== todayStr) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = getLocalYMD(yesterday)

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

  // Load user details/journals to view another user's dashboard (Requires JWT)
  const handleViewUserDashboard = async (userId) => {
    setLoadingSelectedUser(true)
    setIsModalOpen(true)
    setSelectedUser(null)
    setSelectedUserJournals([])
    
    try {
      const profileRes = await fetch(`${API_BASE}/yatra/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setSelectedUser(profileData)
      }
      
      const journalsRes = await fetch(`${API_BASE}/yatra/journals/seeker/${userId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
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

  // OTP Login/Register Onboarding Screen
  if (!user) {
    return (
      <div className="app-container registration-container">
        {/* Floating Theme Toggle */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 100 }}>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', minHeight: 'auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Global Surfing Loader */}
        {(isGeneratingOtp || isVerifyingOtp || isSubmittingJournal) && (
          <SurfingLoader 
            message={
              isGeneratingOtp ? "Dispatched Security OTP to your inbox..." :
              isVerifyingOtp ? "Establishing Seeker credentials with Acharya..." :
              "Engaging meditation to review your Wisdom Log..."
            } 
          />
        )}

        <div className="card registration-card text-center">
          <div className="logo-section mb-4" style={{ justifyContent: 'center' }}>
            <BookOpen size={40} className="logo-icon" />
            <div className="logo-text">
              <h1>GyanYatra</h1>
              <p>Path of Knowledge</p>
            </div>
          </div>
          
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Welcome to the AI-powered learning dashboard. Enter your email to receive a secure OTP code to access or register your Seeker profile.
          </p>
          
          {errorMsg && (
            <div className="card mb-4" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'var(--color-danger)', color: '#fecaca', padding: '0.75rem', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div className="card mb-4" style={{ background: 'rgba(243, 156, 18, 0.15)', borderColor: 'var(--accent-gold)', color: '#fef08a', padding: '0.75rem', fontSize: '0.85rem', fontWeight: '500' }}>
              {successMsg}
            </div>
          )}
          
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="mt-4">
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
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={otpCooldown > 0 || isGeneratingOtp}
              >
                {isGeneratingOtp ? (
                  <><Loader size={16} className="spinner" /> Dispatched...</>
                ) : otpCooldown > 0 ? (
                  `Resend security code in ${otpCooldown}s`
                ) : (
                  <>Send Security OTP <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-4">
              <div className="form-group text-left" style={{ textAlign: 'left' }}>
                <label className="form-label">Security OTP Code</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="6-digit security code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  minLength={6}
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  required
                />
              </div>
              
              <div className="form-group text-left" style={{ textAlign: 'left' }}>
                <label className="form-label">Seeker Name (New users only)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Ankit Rai (Skip if returning)"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setOtpSent(false); setErrorMsg(''); setSuccessMsg(''); }} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  disabled={isVerifyingOtp}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                >
                  {isVerifyingOtp ? (
                    <><Loader size={16} className="spinner" /> Entering...</>
                  ) : (
                    <>Verify & Enter <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Month Calendar Grid Builder
  const renderMonthCalendar = (userJournals) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday...

    // Total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Extract study dates of this month
    const studyDates = new Set(
      userJournals.map(j => getLocalYMD(j.createdAt))
    );

    const daysGrid = [];
    // Empty slots for padding before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      daysGrid.push({ day: null, dateStr: '', status: 'empty' });
    }

    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      const checkDate = new Date(year, month, d);
      const dateStr = getLocalYMD(checkDate);
      const hasStudied = studyDates.has(dateStr);
      const isFuture = checkDate > now;
      const isToday = dateStr === getLocalYMD(now);
      
      let status = 'missed';
      if (hasStudied) status = 'completed';
      else if (isToday && !hasStudied) status = 'today-pending';
      else if (isFuture) status = 'future';

      daysGrid.push({ day: d, dateStr, status });
    }

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="streak-month-view">
        <h3 className="calendar-month-title">
          {now.toLocaleString('default', { month: 'long' })} {year}
        </h3>
        <div className="calendar-grid-header">
          {weekdays.map(wd => <span key={wd} className="calendar-weekday-label">{wd}</span>)}
        </div>
        <div className="calendar-grid-days">
          {daysGrid.map((cell, idx) => {
            if (cell.status === 'empty') {
              return <div key={idx} className="calendar-cell empty" />;
            }
            return (
              <div 
                key={idx} 
                className={`calendar-cell ${cell.status}`}
                title={cell.status === 'completed' ? `Study completed on ${cell.dateStr}` : cell.dateStr}
              >
                <span className="day-number">{cell.day}</span>
                {cell.status === 'completed' && <span className="cell-marker check">✓</span>}
                {cell.status === 'missed' && <span className="cell-marker cross">✗</span>}
                {cell.status === 'today-pending' && <span className="cell-marker pending">•</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Week-by-Week Progress List
  const renderWeekProgress = (userJournals) => {
    const getWeekRange = (weekOffset) => {
      const today = new Date();
      const day = today.getDay() || 7;
      const mon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day + 1 - (weekOffset * 7));
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      return { mon, sun };
    };

    const studyDates = new Set(
      userJournals.map(j => getLocalYMD(j.createdAt))
    );

    const last12Weeks = [];
    for (let w = 0; w < 12; w++) {
      const { mon, sun } = getWeekRange(w);
      let studiedInWeek = false;
      
      const temp = new Date(mon);
      while (temp <= sun) {
        if (studyDates.has(getLocalYMD(temp))) {
          studiedInWeek = true;
          break;
        }
        temp.setDate(temp.getDate() + 1);
      }

      const rangeStr = `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      last12Weeks.push({
        rangeStr,
        studied: studiedInWeek,
        isCurrent: w === 0
      });
    }

    return (
      <div className="streak-weeks-list">
        {last12Weeks.map((wk, idx) => (
          <div key={idx} className={`week-row ${wk.studied ? 'completed' : 'missed'} ${wk.isCurrent ? 'current' : ''}`}>
            <span className="week-range">{wk.rangeStr} {wk.isCurrent && <span className="badge-current">This Week</span>}</span>
            <span className={`week-status-tag ${wk.studied ? 'completed' : 'missed'}`}>
              {wk.studied ? 'Active ✓' : 'Missed ✗'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Year Months Grid Progress
  const renderYearProgress = (userJournals) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const activeMonths = new Set(
      userJournals.map(j => {
        const d = new Date(j.createdAt);
        if (d.getFullYear() === year) {
          return d.getMonth();
        }
        return null;
      }).filter(m => m !== null)
    );

    return (
      <div className="streak-year-grid">
        {monthNames.map((name, idx) => {
          const hasStudied = activeMonths.has(idx);
          const isFuture = idx > now.getMonth();
          const isCurrent = idx === now.getMonth();
          
          let status = 'missed';
          if (hasStudied) status = 'completed';
          else if (isFuture) status = 'future';
          else if (isCurrent) status = 'today-pending';

          return (
            <div key={idx} className={`month-card ${status} ${isCurrent ? 'current' : ''}`}>
              <span className="month-name">{name}</span>
              <div className="month-status-desc">
                {status === 'completed' ? 'Graded ✓' : status === 'future' ? 'Locked' : 'Missed ✗'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Global Surfing Loader */}
      {(isGeneratingOtp || isVerifyingOtp || isSubmittingJournal) && (
        <SurfingLoader 
          message={
            isGeneratingOtp ? "Dispatched Security OTP to your inbox..." :
            isVerifyingOtp ? "Establishing Seeker credentials with Acharya..." :
            "Engaging meditation to review your Wisdom Log..."
          } 
        />
      )}

      {/* Header */}
      <header className="app-header">
        <div className="logo-section" onClick={() => setShowPurposeModal(true)} style={{ cursor: 'pointer' }} title="Click to view GyanYatra purpose & why it was built">
          <BookOpen size={36} className="logo-icon" />
          <div className="logo-text">
            <h1>GyanYatra</h1>
            <p>Path of Knowledge <span>ℹ️</span></p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Daily study streak */}
          <div className="streak-badge-container">
            <div 
              className="streak-badge" 
              onClick={() => setShowStreakModal(true)}
              style={{ cursor: 'pointer' }}
              title="Click to view detailed streaks (Daily, Weekly, Monthly, Yearly)"
            >
              <Flame size={14} />
              <span>{streaks.daily} Day Streak</span>
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
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="btn btn-secondary" 
              style={{ padding: '0.35rem 0.6rem', minHeight: 'auto', borderRadius: '50px', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
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
          {/* Portfolio Mastery cloud & Profile Customizer */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h2 className="card-title" style={{ border: 'none', padding: '0', margin: '0' }}>
                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} /> Seeker's Portfolio
              </h2>
              {!isEditingPortfolio && (
                <button 
                  onClick={() => setIsEditingPortfolio(true)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', minHeight: 'auto' }}
                >
                  <Edit2 size={12} /> Edit Profile
                </button>
              )}
            </div>

            {isEditingPortfolio ? (
              <form onSubmit={handleSavePortfolio}>
                <div className="form-group">
                  <label className="form-label">Seeker Display Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Bio / Target Role</label>
                  <textarea 
                    className="form-input" 
                    style={{ minHeight: '60px', fontSize: '0.8rem' }}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell us about your learning goals..."
                  />
                </div>
                
                <div className="portfolio-skills-section">
                  <div className="skills-group">
                    <span className="skills-group-title">
                      <Sparkles size={12} /> Customize Additional Skills
                    </span>
                    <div className="concept-cloud-container" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      {editSkills.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No additional skills added.</span>
                      ) : (
                        editSkills.map((skill, idx) => (
                          <span key={idx} className="skill-tag-editable">
                            {skill}
                            <button type="button" onClick={() => handleRemoveSkill(skill)} className="btn-remove-skill">
                              <X size={10} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="add-skill-form">
                      <input 
                        type="text" 
                        className="form-input add-skill-input" 
                        placeholder="Add skill (e.g. React, Python)"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                      />
                      <button type="button" onClick={handleAddSkill} className="btn btn-secondary btn-add-skill">
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="skills-group" style={{ opacity: 0.8 }}>
                    <span className="skills-group-title" style={{ color: 'var(--accent-gold)' }}>
                      <Lock size={12} /> Earned Platform Skills (Locked)
                    </span>
                    <div className="concept-cloud-container" style={{ marginTop: '0.5rem' }}>
                      {getGraspedConcepts().length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No concepts unlocked yet. Complete Satsangs to earn.</span>
                      ) : (
                        getGraspedConcepts().map((concept, i) => (
                          <span key={i} className="concept-cloud-tag" style={{ cursor: 'not-allowed' }}>
                            🔒 {concept}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => { setIsEditingPortfolio(false); fetchUserProfile(user.id, user.token); }} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Save Portfolio
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p className="portfolio-bio-display">"{user.bio || 'Passionate Seeker on the GyanYatra.'}"</p>
                
                {/* Contribution heatwave map */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Activity Heatwave (Last 365 Days):
                  </div>
                  <ContributionHeatmap journals={journals} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Concepts Grasped from Platform:
                  </div>
                  {getGraspedConcepts().length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No platform concepts unlocked yet. Submit reflections to discover.</div>
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

                {/* Additional Skills Display */}
                {user.additionalSkills && user.additionalSkills.length > 0 && (
                  <div style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Additional Core Skills:
                    </div>
                    <div className="concept-cloud-container">
                      {user.additionalSkills.map((skill, i) => (
                        <span key={i} className="concept-cloud-tag" style={{ borderColor: 'var(--color-info)', color: '#9bf' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category statistics segment */}
                <div className="category-stats-card">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Learning Paradigms Coverages:
                  </div>
                  <div className="stats-grid">
                    <div className="stats-grid">
                      <div className="stat-box">
                        <span className="stat-box-title">Total Topics</span>
                        <span className="stat-box-num">{categoryStats.total}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-box-title">Platform Skills</span>
                        <span className="stat-box-num">{getGraspedConcepts().length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="category-row">
                    <div className="category-header">
                      <span className="category-name">Tech & Systems Design</span>
                      <span className="category-count">{categoryStats.tech.count} logs</span>
                    </div>
                    <div className="category-progress-bar">
                      <div className="category-progress-fill tech" style={{ width: `${categoryStats.total > 0 ? (categoryStats.tech.count / categoryStats.total) * 100 : 0}%` }}></div>
                    </div>
                    {categoryStats.tech.uniqueTopics.length > 0 && (
                      <div className="category-topics-list">
                        Concepts: {categoryStats.tech.uniqueTopics.slice(0, 4).join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="category-row" style={{ marginTop: '0.75rem' }}>
                    <div className="category-header">
                      <span className="category-name">Growth & Productivity</span>
                      <span className="category-count">{categoryStats.growth.count} logs</span>
                    </div>
                    <div className="category-progress-bar">
                      <div className="category-progress-fill growth" style={{ width: `${categoryStats.total > 0 ? (categoryStats.growth.count / categoryStats.total) * 100 : 0}%` }}></div>
                    </div>
                    {categoryStats.growth.uniqueTopics.length > 0 && (
                      <div className="category-topics-list">
                        Concepts: {categoryStats.growth.uniqueTopics.slice(0, 4).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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

      {/* GyanYatra Purpose Modal (Reveal Purpose) */}
      {showPurposeModal && (
        <div className="modal-overlay" onClick={() => setShowPurposeModal(false)}>
          <div className="modal-content purpose-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowPurposeModal(false)}>
              <X size={20} />
            </button>
            <div className="purpose-header text-center">
              <BookOpen size={48} className="logo-icon gold-glow" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800' }}>GyanYatra</h2>
              <p className="purpose-tagline">Path of Knowledge</p>
            </div>
            <div className="purpose-body">
              <div className="purpose-section">
                <h3>❓ What is the purpose of GyanYatra?</h3>
                <p>
                  GyanYatra was created as a mindful, structured dashboard for developers to escape "Tutorial Hell". 
                  Many software engineers consume hours of video tutorials, coding sessions, or architecture tech-talks passively, retaining very little information.
                </p>
                <p>
                  GyanYatra forces active learning by taking raw learning notes, letting an AI-powered <strong>Acharya (Technical Guide)</strong> analyze their completeness and engineering depth, and prompting the user with dynamic review quizzes and memory boosters.
                </p>
              </div>
              <div className="purpose-section">
                <h3>💡 Why did we build it?</h3>
                <ul>
                  <li><strong>Active Retention:</strong> Encourages writing down takeaways in a structured way, recognizing Hinglish terms natively.</li>
                  <li><strong>Spaced Repetition:</strong> Prompts seekers 24 hours later to recall key terms, reinforcing long-term memory pathways.</li>
                  <li><strong>Gamified Growth:</strong> Grants Karma Points (XP) for completing quizzes and revision notes, showcasing skills on a guild leaderboard.</li>
                  <li><strong>Mindful Study Spaces:</strong> Integrates sitar focusing drone sounds to relax the mind, filter out background noise, and aid concentration.</li>
                </ul>
              </div>
              <div className="text-center" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-gold" onClick={() => setShowPurposeModal(false)}>
                  Continue Journey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--accent-gold)' }}>
                    "{selectedUser.bio || 'Passionate Seeker on the GyanYatra.'}"
                  </p>

                  {/* Contribution Heatwave Map */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 className="insight-section-title">Seeker's Contribution Calendar</h3>
                    <ContributionHeatmap journals={selectedUserJournals} />
                  </div>

                  {/* Grasped Concepts */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 className="insight-section-title">Verified Concepts Cloud</h3>
                    <div className="concept-cloud-container" style={{ marginTop: '0.5rem' }}>
                      {Array.from(new Set(
                        selectedUserJournals
                          .filter(j => j.isVerified && j.aiAnalysis && j.aiAnalysis.identifiedConcepts)
                          .flatMap(j => j.aiAnalysis.identifiedConcepts)
                      )).length === 0 ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No concepts unlocked yet.</span>
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
                  
                  {/* Additional Skills */}
                  {selectedUser.additionalSkills && selectedUser.additionalSkills.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 className="insight-section-title">Additional Core Skills</h3>
                      <div className="concept-cloud-container" style={{ marginTop: '0.5rem' }}>
                        {selectedUser.additionalSkills.map((skill, i) => (
                          <span key={i} className="concept-cloud-tag" style={{ borderColor: 'var(--color-info)', color: '#9bf' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
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

      {/* Streak Details Modal */}
      {showStreakModal && (
        <div className="modal-overlay" onClick={() => setShowStreakModal(false)}>
          <div className="modal-content streak-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowStreakModal(false)}>
              <X size={20} />
            </button>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Flame size={32} className="gold-glow" style={{ color: 'var(--accent-gold)' }} />
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
                    Your GyanYatra Streak Insights
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Visualizing your discipline across the week, month, and year
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-body">
              {/* Streak Summaries */}
              <div className="streak-summary-cards">
                <div className="streak-summary-card">
                  <span className="summary-label">Daily Streak</span>
                  <span className="summary-value">{streaks.daily} Days</span>
                </div>
                <div className="streak-summary-card">
                  <span className="summary-label">Weekly Streak</span>
                  <span className="summary-value">{streaks.weekly} Weeks</span>
                </div>
                <div className="streak-summary-card">
                  <span className="summary-label">Monthly Streak</span>
                  <span className="summary-value">{streaks.monthly} Months</span>
                </div>
                <div className="streak-summary-card">
                  <span className="summary-label">Yearly Streak</span>
                  <span className="summary-value">{streaks.yearly} Years</span>
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="modal-tabs">
                <button 
                  className={`tab-btn ${activeStreakTab === 'week' ? 'active' : ''}`}
                  onClick={() => setActiveStreakTab('week')}
                >
                  Week View
                </button>
                <button 
                  className={`tab-btn ${activeStreakTab === 'month' ? 'active' : ''}`}
                  onClick={() => setActiveStreakTab('month')}
                >
                  Month View (Calendar)
                </button>
                <button 
                  className={`tab-btn ${activeStreakTab === 'year' ? 'active' : ''}`}
                  onClick={() => setActiveStreakTab('year')}
                >
                  Year View
                </button>
              </div>

              <div className="streak-modal-body" style={{ marginTop: '1.25rem' }}>
                {activeStreakTab === 'week' && renderWeekProgress(journals)}
                {activeStreakTab === 'month' && renderMonthCalendar(journals)}
                {activeStreakTab === 'year' && renderYearProgress(journals)}
              </div>

              <div className="text-center" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-gold" onClick={() => setShowStreakModal(false)}>
                  Continue Surf
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
