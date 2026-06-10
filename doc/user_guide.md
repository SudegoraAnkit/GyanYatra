# GyanYatra: Seeker's Guide to Technical Mastery

Welcome to GyanYatra ("Path of Knowledge"). This guide walks you through the features of the platform, explaining how to log your learning sessions ("Satsangs"), work with the AI coach ("Acharya"), track your study streaks, and manage your seeker portfolio.

---

## 🚀 Getting Started

### 1. Passwordless Authentication (OTP)
GyanYatra does not use passwords. To log in or register a new profile:
- Enter your email address on the login screen.
- Click **Send Security OTP**.
- A 6-digit verification code will be dispatched to your email (in development mode, the OTP is also logged to the backend console for convenience).
- **Rate Limit:** You can only request one OTP every 60 seconds. A countdown timer will display on the screen.
- Enter the 6-digit code and click **Verify & Enter**. If you are a new user, a default profile will be created for you automatically.

### 2. Customizing Your Portfolio
Your portfolio showcases your achievements and skills:
- Click the **Edit Seeker Profile** button on your portfolio card.
- Customize your **Display Name** and **Seeker Bio**.
- **Additional Skills (Editable):** Type in custom skills (like `Go`, `Docker`, or `Kubernetes`) and press Add. These display as custom blue skill tags.
- **Platform Skills (Locked):** Skills verified by the AI coach during study logs are automatically unlocked and marked with a lock symbol (🔒). These cannot be manually edited, preserving your credential integrity.

---

## 📝 Logging a Study Session (Satsang)

To log your daily technical study:
1. Locate the **Log your Wisdom Satsang** panel.
2. Enter the **Video URL** (e.g., YouTube tutorial, system design lecture, or coding video).
3. Type in your **Study Notes**. Focus on:
   - Technical details and trade-offs.
   - Time and space complexity.
   - Algorithms or architectural structures discussed.
4. Click **Engage Meditation**.

### The Meditation Ring
While the Acharya AI evaluations run in the background (typically taking 2-4 seconds), the interface displays a full-screen **Lotus Breathing Meditation Ring** overlay. Take this time to follow the expanding and contracting ring to sync your breathing and clear your mind.

### AI Grading & curations
Once the meditation completes, the Acharya AI evaluates your notes:
- **Verification:** Notes that lack technical depth or do not match the video topic will fail verification.
- **Gap Analysis:** Shows concepts you might have missed.
- **Curated Trials:** Clickable links to target practice (LeetCode practice problems for coding sessions, reference documentation for system design, or habit challenges for growth).
- **Karma Points:** Verified logs award you with **Karma Points**, boosting your level and leaderboard standings.

---

## 📊 Visualizing Consistency

### 1. The 365-Day Contribution Heatmap
Your portfolio contains a GitHub-style heatmap showing your learning logs over the past year. Darker cells represent days with multiple logged and verified study sessions. Hover over any cell to see the number of logs completed on that date.

### 2. Detailed Streak Insights
Clicking the **Daily Streak Badge** in the top-right header launches the detailed **Streak Insights Modal**. This contains three progress tabs:

- **Month View (Calendar):** 
  - Renders a standard calendar grid for the current month.
  - **Streak Highlight:** Active consecutive daily study streaks are highlighted with a glowing golden border and a flickering golden **Flame icon** (`🔥`) inside the cell.
  - Standard completed study days (not part of the *current active* daily streak) display as a green checkmark (`✓`).
  - Missed days show a red cross (`✗`), today shows a gold dot (`•`) if study is pending, and future days are styled with dashed borders indicating they are locked.
- **Week View:** 
  - Lists your weekly progress over the last 12 weeks.
  - Weeks containing at least one verified study session are marked as **Active**, while others are marked as **Missed**.
- **Year View:** 
  - Displays a 12-month calendar grid for the current year. Months with at least one verified log are highlighted.

---

## 🎨 Zen Themes

GyanYatra supports two premium visual interfaces:
- **Dark Mode (Default):** A low-light, high-focus dark theme designed for midnight coding sessions.
- **Zen Light Mode:** A low-contrast warm theme styled with warm ivory backgrounds, soft sand/clay cards, and deep golden ochre highlights to minimize eye strain.
- **How to toggle:** Click the theme toggle icon (Sun/Moon) in the top-right corner of the dashboard header.
