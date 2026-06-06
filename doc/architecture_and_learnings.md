# GyanYatra: Architectural Blueprint, Technical Specifications, and Engineering Learnings

This document serves as the complete technical handbook for GyanYatra ("Path of Knowledge"). It details the product requirements, architectural design, database schemas, implementation decisions, and the real-world debugging challenges I encountered and resolved while building this system from scratch.

---

## 1. Project Overview

### Context & Problem Statement
As developers, we often fall into the trap of "Tutorial Hell"—consuming endless hours of video lectures and documentation without writing code or engaging in active recall. I designed and built **GyanYatra** to combat this. 

GyanYatra is a gamified, AI-assisted study tracker and portfolio generator. Instead of static checklist trackers, it enforces active recall by requiring developers to summarize their learning logs ("Satsangs"). An LLM-powered AI coach ("Acharya") verifies the authenticity of these notes, classifies the topics, suggests targeted practice resources, and awards "Karma Points."

### The Core Solution
GyanYatra consists of:
- **A Secure, Passwordless Authentication Flow:** Using temporary, rate-limited One-Time Passwords (OTPs) dispatched directly to the seeker's email.
- **An AI-Powered Evaluation Engine ("Acharya"):** Analyzing study logs to extract concepts, classify them (Coding, System Design, or Productivity), suggest curated high-quality reference links (e.g., LeetCode, GeeksforGeeks, System Design Primer), and prevent spam.
- **Gamification Mechanics:** Tracking historical daily, weekly, monthly, and yearly learning streaks, alongside a GitHub-style 365-day contribution calendar.
- **Dynamic Seeker Portfolios:** Showcasing a public profile with verified skills (locked by the system upon AI verification) and customizable profile information (bio, custom skills).
- **A Guild Leaderboard:** Ranking seekers by cumulative Karma Points to drive healthy community competition.
- **Zen Aesthetics:** Designed with a dark-first theme and a warm Zen light mode using CSS custom variables to promote focus and clarity.

### Technical Stack
- **Frontend:** React (Vite), Vanilla CSS, Lucide React (icons), ESBuild.
- **Backend:** Java 17+, Spring Boot 3.x, Spring Data MongoDB, Spring Mail.
- **Database:** MongoDB (MongoDB Atlas Cluster).
- **AI Integration:** Google Gemini LLM API (orchestrated via Java HTTP client).
- **Deployment:** Docker, multi-stage build systems.

---

## 2. Requirements & Use Cases

### Functional Requirements

#### 1. Passwordless Authentication (OTP)
- **Sign-up / Sign-in:** Users enter an email address. The backend checks if the user exists; if not, it automatically registers them.
- **Verification:** The system sends a 6-digit numeric security code via email. The user must submit it within 5 minutes.
- **Rate Limiting:** Users can request an OTP only once every 60 seconds.

#### 2. Wisdom Log Submission (Satsang)
- **Inputs:** Users submit a video/source URL and detailed study notes summarizing what they learned.
- **AI Assessment:** The Acharya AI verifies whether the notes match the video topic (or are authentic). It extracts primary concepts, awards Karma, and determines recommendations.
- **No Duplicates:** The system blocks duplicate logs of the same resource to prevent "farming" Karma points.

#### 3. Activity Visualization (Streak & Heatmap)
- **Contribution Heatmap:** A 365-day calendar grid displaying study frequency and intensity.
- **Streak Breakdown:** An interactive modal showing:
  - *Daily Streak:* Total consecutive days studied, highlighted on a monthly calendar grid using a flickering Flame theme.
  - *Weekly Streak:* A timeline showing the last 12 weeks of active/missed study weeks.
  - *Monthly / Yearly Streaks:* An annual calendar grid tracking monthly check-ins.

#### 4. Seeker Portfolios & Guilds
- **Editable Profiles:** Users can update their name, bio, and manually input skills.
- **Locked System Skills:** Skills verified by Acharya are locked (rendered with a lock icon) to protect credential integrity.
- **Leaderboard:** An aggregate view of all registered seekers ranked by cumulative Karma.

```
+-------------------------------------------------------------+
|                        GyanYatra UI                         |
+-------------------------------------------------------------+
       |                                              ^
       | HTTP REST                                    | React State
       v                                              | Updates
+-------------------------------------------------------------+
|                    Vite React Frontend                      |
|  - App.jsx (State, Forms, Calendars, Themes)                |
|  - index.css (Dark/Light Zen Custom Properties & Grids)    |
+-------------------------------------------------------------+
       |
       | JSON over HTTPS (CORS enabled)
       v
+-------------------------------------------------------------+
|                 Spring Boot REST API Gateway                |
|  - UserController (Auth / Profile Operations)               |
|  - JournalController (Wisdom Logs / History)                |
+-------------------------------------------------------------+
       |
       +-----------------------+-----------------------+
       | (Direct JVM Call)     | (Spring Data)         | (Spring Mail)
       v                       v                       v
+---------------+      +---------------+      +---------------+
|  gyanyatra_ai |      | gyanyatra_core|      |  SMTP Server  |
| - Gemini API  |      | - MongoDB     |      | - Brevo SMTP  |
| - Prompt Eng. |      | - Models      |      | - OTP Emails  |
+---------------+      +---------------+      +---------------+
```

---

## 3. System & Tech Architecture

### Decoupling Message Queues for Light Deployment
Initially, I designed the AI evaluation pipeline using an asynchronous messaging model with **RabbitMQ** (via `spring-boot-starter-amqp`) to handle heavy LLM processing in the background. While robust, this introduced severe hosting constraints for lightweight, free-tier cloud environments (requiring a separate RabbitMQ broker container, connection recovery handling, and increased memory footprint). 

I decided to refactor the architecture to be fully self-contained:
1. **Direct Synchronous / Non-blocking AI Invocations:** Replaced the AMQP messaging queue setup with a direct service invocation layer.
2. **Elimination of Classpath Dependencies:** Completely commented out and removed the RabbitMQ dependencies from `pom.xml`, and deleted configuration files (`RabbitConfig.java`, `AcharyaMessagingConfig.java`).
3. **Simulated Sandbox Mode:** Implemented a toggleable frontend/backend simulator flag. If enabled, the system uses in-memory mock classification to conserve Google Gemini token quotas during development.

This architectural shift reduced memory consumption by nearly 40% and simplified deployment down to a simple backend jar and static frontend files.

---

## 4. Data Model & APIs

### Database Schema (MongoDB)
I chose MongoDB due to the semi-structured nature of the AI-generated metadata. The data model is split into two primary collections: `users` and `journals`.

#### `users` Collection
Stores user credentials, profile attributes, and total Karma points.
```json
{
  "_id": { "$oid": "665f8d9a2bc95a1234567890" },
  "name": "Arjun Seeker",
  "email": "arjun@gyanyatra.edu",
  "bio": "Studying distributed systems and habits.",
  "additionalSkills": ["Go", "Kubernetes"],
  "totalKarmaPoints": 150,
  "createdAt": { "$date": "2026-06-01T00:00:00.000Z" }
}
```

#### `journals` Collection
Stores the Satsang log entries submitted by users and the rich metadata returned by the Acharya AI engine.
```json
{
  "_id": { "$oid": "665f9a8b2bc95a9876543210" },
  "userId": "665f8d9a2bc95a1234567890",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "userNotes": "I studied Paxos and Raft. Raft simplifies state space by using a strong leader...",
  "isVerified": true,
  "karmaPointsAwarded": 15,
  "aiAnalysis": {
    "authenticityScore": 95,
    "identifiedConcepts": ["Distributed Consensus", "Raft Protocol"],
    "summary": "Detailed notes explaining election timeouts and log replication in Raft.",
    "category": "Systems Design",
    "relevantTrials": [
      {
        "title": "Raft Consensus Paper Reference",
        "url": "https://raft.github.io/"
      },
      {
        "title": "GeeksforGeeks System Design Tutorials",
        "url": "https://www.geeksforgeeks.org/system-design-tutorial/"
      }
    ]
  },
  "createdAt": { "$date": "2026-06-05T07:26:49.000Z" }
}
```

---

### Core API Endpoints

#### 1. Authentication

* `POST /api/v1/users/login/otp/generate`
  - Generates a rate-limited OTP and sends it via email.
  - **Request Body:** `{ "email": "user@example.com" }`
  - **Responses:**
    - `200 OK`: `{"message": "OTP security code successfully dispatched."}`
    - `429 Too Many Requests`: `{"error": "Too many requests. Please wait 45 seconds."}`

* `POST /api/v1/users/login/otp/verify`
  - Verifies the OTP and issues a JWT token.
  - **Request Body:** `{ "email": "user@example.com", "otp": "123456" }`
  - **Responses:**
    - `200 OK`: Returns User object and JWT headers.
    - `400 Bad Request`: `{"error": "Invalid OTP format"}`
    - `401 Unauthorized`: `{"error": "Invalid or expired OTP"}`

#### 2. Wisdom Logs (Satsangs)

* `POST /api/v1/yatra/journals`
  - Submits a study log for AI validation.
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:** `{ "videoUrl": "https://...", "userNotes": "Detailed notes..." }`
  - **Responses:**
    - `200 OK`: Returns the saved Journal entry with `aiAnalysis`.
    - `409 Conflict`: `{"error": "This Satsang has already been logged in your Yatra."}` (Custom `GyanYatraException` mapping).

---

## 5. Implementation Details

### Timezone-Safe Date Operations
One of the trickiest details of this application was ensuring that calendar grids aligned perfectly with the user's physical date. In javascript, dates default to UTC when serialized or formatted via standard helpers like `.toISOString()`. 

To solve this, I wrote a dedicated frontend helper to format date instances to the local timezone's `YYYY-MM-DD` representation:
```javascript
const getLocalYMD = (dateInput) => {
  const d = safeParseDate(dateInput)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

### Streak Calculation Engine
Streaks are calculated on-the-fly when journals load. The daily streak calculation inspects study dates (sorted descending, newest first) and verifies whether there is a log completed on `today` or `yesterday` (to prevent streak reset if the user has not studied *yet* today). It returns the total count and a `Set` of dates that make up the current active streak so they can be visually highlighted:

```javascript
// Truncated snippet from App.jsx
const calculateStreaks = (userJournals) => {
  // Extract unique sorted YYYY-MM-DD strings
  const dates = Array.from(new Set(
    userJournals.map(j => getLocalYMD(j.createdAt))
  )).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));

  const todayStr = getLocalYMD(new Date());
  const yesterdayStr = getLocalYMD(new Date(Date.now() - 86400000));

  let daily = 0;
  const activeStreakDates = new Set();
  let hasToday = dates.includes(todayStr);
  let hasYesterday = dates.includes(yesterdayStr);

  if (hasToday || hasYesterday) {
    let current = hasToday ? todayStr : yesterdayStr;
    daily = 1;
    activeStreakDates.add(current);
    let nextIndex = dates.indexOf(current) + 1;
    let checkDate = new Date(current);

    while (nextIndex < dates.length) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalYMD(checkDate);
      if (dates.includes(checkStr)) {
        daily++;
        activeStreakDates.add(checkStr);
        nextIndex = dates.indexOf(checkStr) + 1;
      } else {
        break;
      }
    }
  }
  // (Weekly, Monthly, Yearly calculations continue below...)
  return { daily, weekly, monthly, yearly, activeStreakDates };
}
```

### Warm Zen Theme System
The UI utilizes CSS custom properties to transition between Dark and Light mode smoothly. Instead of a stark white background for light mode, I designed a warm, low-contrast Zen theme:

```css
:root {
  /* Dark Mode default palette */
  --bg-primary: #0a0a0f;
  --bg-secondary: rgba(255, 255, 255, 0.03);
  --border-color: rgba(255, 255, 255, 0.08);
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent-gold: #f59e0b;
}

:root[data-theme="light"] {
  /* Warm Zen Light Mode palette */
  --bg-primary: #fcfbfa;       /* Warm ivory background */
  --bg-secondary: #f3efe6;     /* Soft sand/clay card background */
  --border-color: rgba(194, 125, 12, 0.15);
  --text-primary: #2d261e;     /* Deep charcoal brown */
  --text-secondary: #6e6458;   /* Soft warm grey */
  --accent-gold: #c27d0c;      /* Deep golden ochre */
}
```

---

## 6. Challenges & Solutions

### Challenge 1: Preventing OTP Abuse (Brute Force & Spam)
* **Problem:** Because GyanYatra relies on passwordless email OTP verification, the backend is vulnerable to brute force attacks (trying every 6-digit combination) and SMTP spamming (generating thousands of emails to run up API billing).
* **Solution:** 
  1. **Strict Client-Side Validation:** The UI OTP input restricts entries to exactly 6 numeric characters. Non-digit keystrokes are actively stripped on `onChange`.
  2. **Server-Side Type Hardening:** The API controller validates the input string structure against regex `^[0-9]{6}$` before sending it to the verification cache. Any invalid input is blocked with `400 Bad Request`.
  3. **Dual-Layer Cooldowns:** When an OTP is requested, the client disables the request button and runs a 60-second visual countdown timer. Simultaneously, the backend `OtpService` records the request timestamp in an in-memory cache and rejects requests within 60 seconds with `429 Too Many Requests`.

### Challenge 2: AI Link Recommendations Consistency
* **Problem:** Prompting Google Gemini to recommend references often led to broken URL formats, generic homepage links, or mixed categorizations (e.g., suggesting LeetCode coding links for a system design log).
* **Solution:** Refined the prompt templates in `AcharyaService` to explicitly segment recommendations into three strict paradigms:
  1. **Coding/DSA:** Returns links strictly to GeeksforGeeks or LeetCode problem paths.
  2. **Systems Design:** Returns links to System Design primers or documentation tutorials (never LeetCode).
  3. **Productivity/Growth:** Returns actual book references or specific habit challenges.
  I also instructed the model to output a strict JSON list of objects containing valid, fully-formed, clickable HTTPS URLs, backed by a hardcoded fallback classifier that validates URL patterns before outputting them to the UI.

---

## 7. Incident / Bug Postmortems

### Postmortem 1: The JSR-310 Integer Array Serialization Bug

#### Incident Summary
Seekers logging study sessions reported that the Contribution Heatmap appeared empty and the daily study streak was locked at `0`.

#### Technical Breakdown & Root Cause
The backend utilizes Java 8's JSR-310 `LocalDateTime` for database timestamps (`createdAt`). By default, Jackson serialization converts `LocalDateTime` objects to raw JSON integer arrays (representing `[year, month, day, hour, minute, second]`) rather than formatted strings, to avoid serialization errors. 
When the frontend received the journals array, it passed the `createdAt` value (e.g., `[2026, 6, 5, 7, 26]`) directly to the Javascript `new Date()` constructor. Evaluating `new Date([2026, 6, 5])` resulted in an `Invalid Date` error, causing all date comparison logic in the heatmap and streak engines to fail silently.

#### Resolution & Prevention
1. **Backend Configuration:** I updated the API project's `application.properties` to disable writing dates as timestamps:
   ```properties
   spring.jackson.serialization.write-dates-as-timestamps=false
   ```
2. **Frontend Resilience:** To protect against varying serialization configurations, I wrote a robust `safeParseDate` parsing helper in `App.jsx` to intercept the date input:
   ```javascript
   const safeParseDate = (dateInput) => {
     if (!dateInput) return null;
     if (dateInput instanceof Date) return dateInput;
     if (Array.isArray(dateInput)) {
       // Re-construct the date object using 0-indexed months
       const year = dateInput[0] || 1970;
       const month = (dateInput[1] || 1) - 1;
       const day = dateInput[2] || 1;
       const hour = dateInput[3] || 0;
       const minute = dateInput[4] || 0;
       const second = dateInput[5] || 0;
       return new Date(year, month, day, hour, minute, second);
     }
     const d = new Date(dateInput);
     return isNaN(d.getTime()) ? null : d;
   };
   ```
   This dual-layer defense immediately restored standard calendar highlights and streak calculations.

---

### Postmortem 2: The Timezone Shift Streak Reset Bug

#### Incident Summary
Seekers in eastern timezones (specifically IST, GMT+5:30) noticed that logging a study session early in the morning (between 12:00 AM and 5:30 AM local time) registered successfully, but their Daily Study Streak was reset to `0`.

#### Technical Breakdown & Root Cause
To identify calendar dates, the frontend was converting the journal's `createdAt` string to a local date string using the standard:
```javascript
const dateStr = date.toISOString().split('T')[0];
```
The `.toISOString()` method evaluates the date object based on **UTC** (Coordinated Universal Time). When a developer in India (GMT+5:30) logged a study session at 2:00 AM on June 5th, the local timestamp was `2026-06-05T02:00:00`. 
Converting this to UTC shifted the timestamp back by 5.5 hours to the previous day: `2026-06-04T20:30:00Z`. Splitting the string extracted `2026-06-04`. The frontend recorded the study day as the previous day, resulting in a gap on the current day's streak list and resetting the active streak.

#### Resolution & Prevention
I completely eliminated standard UTC serialization splits on the frontend, replacing them with timezone-safe local date evaluations using `getFullYear()`, `getMonth()`, and `getDate()`. This ensures that dates are mapped strictly to the user's browser timezone offset, preventing offset-induced streak resets.

---

## 8. Personal Learnings as a Developer

Building GyanYatra from start to finish was a masterclass in architectural trade-offs. Here are the key developer insights I'm taking away from this project:

1. **Keep Architectures Lean in the Beginning:**
   My initial RabbitMQ design was technically elegant, but it was an over-engineered solution for the project's scale. By removing it and utilizing synchronous, non-blocking integrations, I made the codebase vastly simpler to test, package, and deploy, showing me that scalability should always be driven by actual demand rather than theoretical complexity.

2. **Always Standardize Date Serialization Contracts Early:**
   Debugging the timezone offset and JSR-310 date parsing bugs reinforced how crucial it is to define a strict, uniform date format contract between the frontend and backend. I learned that relying on standard UTC-based ISO serialization (`toISOString`) without custom format wrappers is a recipe for silent UI errors in globally distributed client applications.

3. **Design for API Resilience (Preserving Quotas):**
   Using third-party LLM APIs in developer environments can quickly deplete trial limits. Building a sandbox simulation mode directly into my API controllers allowed me to test interface layouts, grid rendering, and animations offline without incurring high latency or API token charges.

4. **Security is a Multi-Layer Responsibility:**
   Securing the OTP login taught me that frontend validation (disabling buttons, regex patterns) is only for visual user experience. Without strict backend filters (such as input matching constraints and timestamp checks), client-side safety measures are easily bypassed with basic cURL scripts.
