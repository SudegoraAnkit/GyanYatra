# GyanYatra: AI-Powered Learning Synthesizer & Mastery Dashboard

GyanYatra is a production-grade, AI-powered learning organizer that transforms passive video content consumption (e.g., YouTube lectures, system design talks, coding tutorials) into verified active technical mastery. By forcing active cognitive reflection, generating automated gap analyses, providing spaced repetition prompts, and incentivizing consistency through gamified community leaderboards, GyanYatra bridges the gap between understanding a tutorial and mastering a skill.

---

## 🎯 Current Product Goal

Modern professionals spend hours consuming technical talks but retain less than **10%** of the information, suffering from the **"Illusion of Competence."** 

GyanYatra's core goal is to **turn passive viewers into active seekers**. Seekers submit structured summaries (notes) of educational video lectures. The system uses advanced AI evaluations to:
1. **Assess Comprehension**: Score summaries dynamically based on technical depth, time/space complexity, trade-offs, or habit loop concepts.
2. **Identify Knowledge Gaps**: Pinpoint exactly what concepts the user misunderstood or omitted.
3. **Recommend Target Practice**: Provide tailored "Trials" (LeetCode links for developers, execution exercises for productivity).
4. **Reward & Gamify**: Distribute **Karma Points** to boost daily study streaks and push users up organization-wide leaderboards.

---

## 🏗️ System Design Architecture

GyanYatra is built on a modern, decoupled, event-driven microservices architecture that handles high volume REST ingest while offloading AI processing asynchronously.

### Architecture Diagram

```mermaid
graph TD
    %% Clients
    Seeker[Vite + React UI Client] -->|1. Submit Log / Get Leaderboard| Gateway[Spring Boot API Controller]
    
    %% API Services
    subgraph Spring Boot API Layer [gyanyatra_api]
        Gateway -->|2. Save Draft| MongoDB[(MongoDB - 27017)]
        Gateway -->|3. Route Message| RabbitMQ{RabbitMQ Exchange - 5672}
        Gateway -->|Simulate Check| LocalGrader[Local Mock Rule Grader]
    end

    %% Async Consumer
    subgraph AI Processing Engine [gyanyatra_ai]
        Consumer[Acharya Log Consumer] <--|4. Poll Queue| RabbitMQ
        Consumer -->|5. Check Cache| LessonCache[Lesson Deduplication Cache]
        Consumer -->|6. Query Model| SpringAI[Spring AI Gemini Core Client]
        SpringAI -->|Google GenAI API| Gemini[Gemini LLM Engine]
        Consumer -->|7. Update Results| MongoDB
    end

    %% Database Collections
    subgraph Data Layer
        MongoDB -->|Collections| Users[(users)]
        MongoDB -->|Collections| Journals[(journals)]
        MongoDB -->|Collections| Lessons[(lessons)]
    end

    %% Styles
    classDef client fill:#3498db,stroke:#2980b9,color:#fff,stroke-width:2px;
    classDef api fill:#2ecc71,stroke:#27ae60,color:#fff,stroke-width:2px;
    classDef ai fill:#9b59b6,stroke:#8e44ad,color:#fff,stroke-width:2px;
    classDef db fill:#f1c40f,stroke:#f39c12,color:#000,stroke-width:2px;

    class Seeker client;
    class Gateway,RabbitMQ,LocalGrader api;
    class Consumer,LessonCache,SpringAI,Gemini ai;
    class MongoDB,Users,Journals,Lessons db;
```

### Request Lifecycle Flow
1. **Submission**: Seeker registers or logs in, and submits a video URL along with Hinglish/English reflections.
2. **Deduplication Check (Simulator Mode)**: If "Preserve AI Quota" is enabled, the request skips the message queue, evaluates notes instantly on local heuristic rules, awards Karma, and updates state in under **10ms**.
3. **Queueing (Production Mode)**: For real LLM analysis, the REST controller saves the journal draft as `isVerified: false` and routes the payload to RabbitMQ. The client immediately renders the **Lotus Breathing Meditation Ring** to guide the seeker through breathing exercises during processing.
4. **Acharya Ingest**: The consumer picks up the log, checks if the video's metadata exists in the global `lessons` cache, and uses the cached lesson parameters to query Spring AI.
5. **AI Synthesis & Grading**: The Acharya evaluates notes against systems design, code constraints, and behavioral science criteria. It saves the resulting scores, concept tags, gap recommendations, and trials back to MongoDB, notifying the client to render the complete mastery map and update community ranks.

---

## 💾 Database Schema Design (MongoDB)

GyanYatra utilizes a document database to persist seeker logs, lessons metadata, and user stats.

### 1. `users` Collection
Stores the profile, gamified points, and audit dates of the seeker.
```json
{
  "_id": "6a1a9b7bd5a91cc765d5832f",
  "name": "Ankit Rai",
  "email": "seeker@gyanyatra.com",
  "totalKarmaPoints": 1500,
  "createdAt": "2026-05-30T14:10:00.000Z"
}
```

### 2. `lessons` Collection
Acts as the global deduplication layer cache. If five users log the same CS50 video, we execute the LLM metadata extraction query only once.
```json
{
  "_id": "6a1aa38a4e95882c1847ede0",
  "title": "Recursion and Call Stacks - CS50",
  "url": "https://www.youtube.com/watch?v=CS50_Recursion",
  "conceptsCovered": [
    "Recursion",
    "Call Stacks",
    "Space Complexity"
  ],
  "interviewQuestions": [
    "What is the amortized time complexity of the operations in this system?",
    "How would you handle boundary cases or empty inputs for this approach?",
    "What are the core memory overhead or space complexity trade-offs?"
  ]
}
```

### 3. `journals` Collection
The core ledger tracking the seeker's daily logs, evaluations, quiz attempts, and spaced repetition consolidations.
```json
{
  "_id": "6a1b2d41a7741d4c2198be01",
  "userId": "6a1a9b7bd5a91cc765d5832f",
  "videoUrl": "https://www.youtube.com/watch?v=CS50_Recursion",
  "userNotes": "I learned how recursion pushes frames to the call stack. Space complexity is O(N) due to memory usage. Baar baar stack frames allocate hote hain.",
  "isVerified": true,
  "noteScore": 85,
  "createdAt": "2026-05-30T14:12:15.000Z",
  "aiAnalysis": {
    "feedback": "Excellent effort! You successfully grasped how recursion interacts with the Call Stack and identified the O(N) memory complexity. To improve, discuss how to handle base cases.",
    "identifiedConcepts": [
      "Call Stacks",
      "Space Complexity"
    ],
    "gapSuggestions": [
      "Inclusion of base case halting conditions to prevent stack overflows."
    ],
    "score": 85,
    "relevantTrials": [
      "LeetCode 225: Implement Stack using Queues",
      "LeetCode 232: Implement Queue using Stacks"
    ]
  }
}
```

---

## 📑 Architecture Decision Records (ADRs)

### ADR-001: Decoupled Asynchronous AI Grading
*   **Context**: LLM processing (Gemini) typically takes between 1.5s to 5s. Processing these synchronously inside a Web Request thread blocks resources and degrades client throughput.
*   **Decision**: Decouple the request intake and persistent drafts from the scoring engine. Use RabbitMQ as a reliable message broker to queue entries. Seekers immediately receive a `202 Accepted` status and view a meditation loader, while a background consumer handles LLM synthesis.
*   **Consequences**: Eliminates thread pool exhaustion on the main API server. If the Gemini API experiences throttling or down-time, logs remain safely queued in RabbitMQ and are processed automatically upon recovery.

### ADR-002: Global Lesson Discovery Cache
*   **Context**: Analyzing YouTube metadata and discovering lesson concepts via AI requires token usage and introduces API latency.
*   **Decision**: Cache lesson identifiers in MongoDB. When a video URL is logged, verify if it is stored in the `lessons` collection. If present, load cached titles, concept tags, and questions directly, bypassing the discovery prompt.
*   **Consequences**: Reduces Gemini token expenses by **30-40%** at scale. Dramatically drops initial queue processing delays for popular learning material.

### ADR-003: Local Simulation Ruleset (Simulator Mode)
*   **Context**: Developers, testing frameworks, and free-tier users need to test the product end-to-end without consuming real Gemini API quotas or requiring active RabbitMQ clusters.
*   **Decision**: Provide a `simulate` boolean parameter on the meditation endpoint. If enabled, evaluate logs locally using a modular Java keyword-matching parser.
*   **Consequences**: The frontend receives a synchronous response in **<10ms**. Allows local development and mock testing with 0 external API costs.

### ADR-004: Zero-Asset Mindful Web Audio Synthesizer
*   **Context**: Media file assets (Zen ambient sitar loops) require host memory, increase bundle sizing, and incur bandwidth transit expenses.
*   **Decision**: Avoid static mp3 files. Synthesize ambient, harmonic drone chords dynamically inside the browser using the **Web Audio API** oscillators.
*   **Consequences**: 0MB bundle addition. Meditative beats load instantly and adjust to the system context volume smoothly.
