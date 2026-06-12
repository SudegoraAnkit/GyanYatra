package com.ankitsudegora.gyanyatra.ai.service;

import com.ankitsudegora.gyanyatra.ai.dto.VideoMetadataDTO;
import com.ankitsudegora.gyanyatra.ai.service.VideoMetadataService;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import com.ankitsudegora.gyanyatra.core.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The Acharya Service is the 'Brain' of Gyan Yatra.
 * It transforms raw Wisdom Logs into structured architectural insights.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AcharyaService {

    private final ChatClient chatClient;
    @Autowired
    private LessonRepository lessonRepository;
    @Autowired
    private VideoMetadataService videoMetadataService;

    /**
     * The Master Sutra (System Prompt) for the Acharya.
     * Evaluates notes based on topic category and generates tailored Trials.
     */
    private static final String ACHARYA_MAIN_PROMPT_TEMPLATE = """
        You are the Acharya, an elite Technical and Personal Growth Guide for the Gyan Yatra.
        Your goal is to evaluate the Seeker's 'Wisdom Log' (notes) for the lesson: {lessonTitle}.
        
        Seeker's Notes: 
        {userNotes}
        
        Evaluation Guidelines:
        1. Context: The Seeker may use a mix of Hindi/English (Hinglish). Understand their intent.
        2. Categorization & Rigor:
           - If the topic is Coding/Data Structures & Algorithms (DSA): In 'relevantTrials', provide exactly 2 valid, fully-formed, clickable LeetCode or GeeksforGeeks practice problem URLs (e.g., "https://leetcode.com/problems/two-sum/"). Do NOT use text names.
           - If the topic is Systems Design / Software Architecture: In 'relevantTrials', provide exactly 2 valid, fully-formed, clickable system design tutorial/article URLs (e.g., "https://www.geeksforgeeks.org/system-design/"). Do NOT provide coding/LeetCode problem links.
           - If the topic is Productivity / Career / Soft Skills / Growth: In 'relevantTrials', provide exactly 2 valid, fully-formed, clickable book resource or article URLs (e.g., "https://jamesclear.com/atomic-habits" or similar). Do NOT provide coding/LeetCode/System Design links.
        3. Tone: Encouraging but intellectually demanding.
        
        Provide your output in valid JSON format with:
        - feedback: A concise summary of their understanding.
        - identifiedConcepts: List of concepts (technical keywords or productivity principles) they correctly grasped.
        - gapSuggestions: Critical concepts or application details they missed or misunderstood.
        - masteryScore: An integer between 0 and 100 (Karma points).
        - relevantTrials: List of strings (ALL items MUST be fully-formed, valid, clickable URLs starting with 'https://').
        - recallQuestions: List of exactly 3 active recall question strings based on the notes and topic to consolidate memory.
        """;

    /**
     * Prompt used to extract metadata when the Seeker provides only a URL.
     * This saves tokens by performing a specialized discovery.
     */
    private static final String ACHARYA_TOPIC_IDENTIFICATION_PROMPT = """
        Analyze this YouTube URL: {videoUrl}
        Video Title: {videoTitle}
        Video Description: {videoDescription}
        
        Identify the primary lesson (Satsang) title, the core concepts covered, and whether it is a technical coding/computer science topic or a productivity/soft skills/self-help topic.
        
        Provide output in valid JSON:
        - title: Concise lesson title.
        - concepts: List of 3-5 keywords.
        - interviewQuestions: List of exactly 3 conceptual questions for self-study/interview review based on the topic.
        """;

    /**
     * Generates insights and FAANG/Productivity Trials for the Seeker's log.
     */
    public AcharyaAnalysis generateInsight(Journal journal, String lessonTitle) {
        return generateInsight(journal, lessonTitle, "dronacharya");
    }

    public AcharyaAnalysis generateInsight(Journal journal, String lessonTitle, String persona) {
        try {
            String personaInstruction = getPersonaSystemInstruction(persona);
            String fullPrompt = personaInstruction + "\n\n" + ACHARYA_MAIN_PROMPT_TEMPLATE;
            PromptTemplate template = new PromptTemplate(fullPrompt);
            Prompt prompt = template.create(Map.of(
                    "lessonTitle", lessonTitle,
                    "userNotes", journal.getUserNotes()
            ));

            return Objects.requireNonNull(chatClient.prompt(prompt)
                            .call()
                            .entity(AcharyaAnalysisResponse.class))
                    .toAcharyaAnalysis();
        } catch (Exception e) {
            log.error("Failed to generate insight via AI model: {}. Falling back to simulated insight.", e.getMessage(), e);
            return generateMockInsightDirect(journal, lessonTitle);
        }
    }

    /**
     * Discovery Sutra: Transforms a raw URL into a structured Lesson object.
     * This leverages real YouTube metadata and fallback categorization.
     */
    public Lesson identifyLessonFromUrl(String videoUrl) {
        // Global Caching & Deduplication: Check database first to save token cost
        java.util.Optional<Lesson> existingLesson = lessonRepository.findByUrl(videoUrl);
        if (existingLesson.isPresent()) {
            log.info("Lesson found in database cache for URL: {}. Bypassing AI discovery.", videoUrl);
            return existingLesson.get();
        }

        String videoTitle = "";
        String videoDescription = "";
        try {
            String videoId = videoMetadataService.extractVideoId(videoUrl);
            VideoMetadataDTO metadata = videoMetadataService.getVideoMetadataById(videoId, false, false, false);
            if (metadata != null) {
                videoTitle = metadata.getTitle();
                videoDescription = metadata.getDescription();
            }
        } catch (Exception e) {
            log.warn("Could not retrieve YouTube metadata for URL {}: {}", videoUrl, e.getMessage());
        }

        try {
            PromptTemplate template = new PromptTemplate(ACHARYA_TOPIC_IDENTIFICATION_PROMPT);
            Prompt prompt = template.create(Map.of(
                    "videoUrl", videoUrl,
                    "videoTitle", videoTitle != null ? videoTitle : "",
                    "videoDescription", videoDescription != null ? videoDescription : ""
            ));

            LessonDiscoveryResponse discovery = Objects.requireNonNull(chatClient.prompt(prompt)
                    .call()
                    .entity(LessonDiscoveryResponse.class));

            Lesson lesson = new Lesson();
            lesson.setTitle(discovery.title());
            lesson.setUrl(videoUrl);
            lesson.setConceptsCovered(discovery.concepts());
            lesson.setInterviewQuestions(discovery.interviewQuestions());
            lessonRepository.save(lesson);
            return lesson;
        } catch (Exception e) {
            log.error("Failed to discover lesson via AI model: {}. Falling back to default/simulated details.", e.getMessage(), e);
            return classifyAndGenerateFallbackLesson(videoUrl, videoTitle, videoDescription);
        }
    }

    private Lesson classifyAndGenerateFallbackLesson(String videoUrl, String videoTitle, String videoDescription) {
        String title = (videoTitle != null && !videoTitle.isEmpty()) ? videoTitle : "Satsang Log";
        String combined = (title + " " + (videoDescription != null ? videoDescription : "")).toLowerCase();
        
        boolean isProductivity = combined.contains("productivity") || combined.contains("procrastinate") ||
                                 combined.contains("habit") || combined.contains("mindset") ||
                                 combined.contains("self help") || combined.contains("soft skill") ||
                                 combined.contains("career") || combined.contains("motivation") ||
                                 combined.contains("focus") || combined.contains("discipline") ||
                                 combined.contains("success") || combined.contains("time management") ||
                                 combined.contains("2-minute");
                                 
        boolean isCoding = combined.contains("leetcode") || combined.contains("dsa") || 
                           combined.contains("algo") || combined.contains("array") || 
                           combined.contains("binary tree") || combined.contains("graph") || 
                           combined.contains("sorting") || combined.contains("recursion") || 
                           combined.contains("dynamic programming") || combined.contains("stack") || 
                           combined.contains("queue") || combined.contains("linked list") || 
                           combined.contains("heap");
        
        Lesson lesson = new Lesson();
        lesson.setUrl(videoUrl);
        lesson.setTitle(title);
        
        if (isProductivity) {
            lesson.setConceptsCovered(List.of("Time Management", "Habit Stacking", "Cognitive Focus"));
            lesson.setInterviewQuestions(List.of(
                "How can you implement the '2-minute rule' in your current daily routine?",
                "What are the common digital/physical distractions in your workspace, and how do you sculpt your environment?",
                "Explain the cue-routine-reward loop for one habit you want to build."
            ));
        } else if (isCoding) {
            lesson.setConceptsCovered(List.of("Data Structures", "Algorithms", "Complexity Analysis"));
            lesson.setInterviewQuestions(List.of(
                "What is the worst-case and amortized time complexity of your approach?",
                "How would you handle boundary cases like null inputs or integer overflow?",
                "What are the memory overheads or space complexity tradeoffs?"
            ));
        } else {
            // Systems Design (Default)
            lesson.setConceptsCovered(List.of("Systems Design", "Software Architecture", "Scalability"));
            lesson.setInterviewQuestions(List.of(
                "How would you handle high availability and replication lag in this database setup?",
                "Where are the potential single points of failure, and how do you mitigate them?",
                "How does introducing a message broker affect consistency bounds?"
            ));
        }
        
        lessonRepository.save(lesson);
        return lesson;
    }

    public AcharyaAnalysis generateMockInsightDirect(Journal journal, String lessonTitle) {
        String notes = journal.getUserNotes() != null ? journal.getUserNotes() : "";
        String combined = (lessonTitle + " " + notes).toLowerCase();
        
        boolean isProductivity = combined.contains("productivity") || combined.contains("procrastinate") ||
                                 combined.contains("habit") || combined.contains("mindset") ||
                                 combined.contains("self help") || combined.contains("soft skill") ||
                                 combined.contains("career") || combined.contains("motivation") ||
                                 combined.contains("focus") || combined.contains("discipline") ||
                                 combined.contains("success") || combined.contains("time management") ||
                                 combined.contains("2-minute");
                                 
        boolean isCoding = combined.contains("leetcode") || combined.contains("dsa") || 
                           combined.contains("algo") || combined.contains("array") || 
                           combined.contains("binary tree") || combined.contains("graph") || 
                           combined.contains("sorting") || combined.contains("recursion") || 
                           combined.contains("dynamic programming") || combined.contains("stack") || 
                           combined.contains("queue") || combined.contains("linked list") || 
                           combined.contains("heap");

        int score = 70;
        List<String> concepts = new java.util.ArrayList<>();
        List<String> gaps = new java.util.ArrayList<>();
        List<String> trials = new java.util.ArrayList<>();

        if (isProductivity) {
            concepts.add("Personal Productivity");
            concepts.add("Habit Architecture");
            
            if (notes.toLowerCase().contains("2-minute") || notes.toLowerCase().contains("two-minute")) {
                concepts.add("The 2-Minute Rule");
                gaps.add("Failing to connect micro-habits to identity-based habit transformation");
                trials.add("https://jamesclear.com/atomic-habits");
                trials.add("https://gettingthingsdone.com/");
                score += 15;
            } else {
                gaps.add("Implementing complex productivity systems that cause burnout");
                trials.add("https://gettingthingsdone.com/");
                trials.add("https://jamesclear.com/habit-tracker");
                score += 5;
            }
        } else if (isCoding) {
            if (notes.toLowerCase().contains("stack") || notes.toLowerCase().contains("queue")) {
                concepts.add("Stacks & Queues");
                concepts.add("Linear Data Structures");
                gaps.add("Space complexity overhead of double-stack queue implementations");
                trials.add("https://leetcode.com/problems/implement-stack-using-queues/");
                trials.add("https://leetcode.com/problems/implement-queue-using-stacks/");
                score += 15;
            } else if (notes.toLowerCase().contains("complexity") || notes.toLowerCase().contains("time") || notes.toLowerCase().contains("o(")) {
                concepts.add("Time Complexity Bounds");
                concepts.add("Big O Notation");
                gaps.add("Difference between amortized time bounds and worst-case bounds");
                trials.add("https://leetcode.com/problems/climbing-stairs/");
                trials.add("https://leetcode.com/problems/fibonacci-number/");
                score += 10;
            } else {
                concepts.add("Algorithms & Data Structures");
                gaps.add("Verify edge cases like empty arrays and single element inputs");
                trials.add("https://leetcode.com/problems/two-sum/");
                trials.add("https://leetcode.com/problems/contains-duplicate/");
            }
        } else {
            // Systems Design
            concepts.add("Systems Engineering");
            concepts.add("Distributed Systems Design");
            
            if (notes.toLowerCase().contains("cache") || notes.toLowerCase().contains("redis")) {
                concepts.add("Caching Strategies");
                gaps.add("Cache invalidation patterns and stampede mitigation");
                trials.add("https://www.geeksforgeeks.org/system-design-caching/");
                trials.add("https://github.com/donnemartin/system-design-primer#cache");
                score += 15;
            } else {
                gaps.add("Verify edge cases like network partitions and idempotent consumers");
                trials.add("https://www.geeksforgeeks.org/system-design/");
                trials.add("https://github.com/donnemartin/system-design-primer");
            }
        }

        if (notes.length() > 100) {
            score += 10;
        }
        score = Math.min(score, 100);

        String feedback = "Excellent effort! You have grasped the main concepts of " + lessonTitle + ". " +
                "Your notes show good understanding. To reach elite mastery, focus on consistency and practical implementation.";

        List<String> recallQuestions = List.of(
            "What is the core design philosophy behind " + lessonTitle + "?",
            "Explain one primary edge case or limitation you must handle when applying " + lessonTitle + ".",
            "How does " + lessonTitle + " improve time/space efficiency or personal productivity?"
        );

        return new AcharyaAnalysis(feedback, concepts, gaps, score, trials, recallQuestions);
    }

    private String getPersonaSystemInstruction(String persona) {
        String base = "You are the Acharya, a wise technical guide and personal growth mentor for Gyan Yatra.";
        if (persona == null) persona = "dronacharya";
        switch (persona.toLowerCase()) {
            case "patanjali":
                return base + " Speak in the persona of Maharshi Patanjali. You are serene, meditative, and focused on mindfulness, step-by-step clarity, and control of the mind. Prefix your response with Sanskrit quote: 'पतञ्जलि उवाच: योगश्चित्तवृत्तिनिरोधः।' (Yoga is the restriction of the fluctuations of mind.) or another yoga-themed Sanskrit quote, and explain it briefly.";
            case "vivekananda":
                return base + " Speak in the persona of Swami Vivekananda. You are energetic, fiery, extremely encouraging, and motivational. You tell the seeker to tap into their infinite strength and knowledge. Prefix your response with Sanskrit quote: 'विवेकानन्द उवाच: उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत।' (Arise, awake, and stop not till the goal is reached.) or another motivational Sanskrit quote.";
            case "chanakya":
                return base + " Speak in the persona of Chanakya (Kautilya). You are strategic, highly logical, realistic, and focused on resource optimization, strict rules, and pragmatic implementation. Prefix your response with Sanskrit quote: 'चाणक्य उवाच: निश्चितं यः समारभते नापवर्गं प्रबाधते।' (One who starts with a firm resolve does not stop until completion.) or another policy/strategy Sanskrit quote.";
            case "dronacharya":
            default:
                return base + " Speak in the persona of Guru Dronacharya. You are strict, highly demanding, martial, and focused on absolute target accuracy (like hitting the wooden bird's eye). Metaphors should relate to weaponry, archery, and warrior focus. Prefix your response with Sanskrit quote: 'द्रोणाचार्य उवाच: उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।' (Success is achieved through effort, not mere wishes.) or another discipline-themed Sanskrit quote.";
        }
    }

    private String getFallbackTutorResponse(String persona, String topicTitle, String userMessage) {
        if (persona == null) persona = "dronacharya";
        switch (persona.toLowerCase()) {
            case "patanjali":
                return "पतञ्जलि उवाच: योगश्चित्तवृत्तिनिरोधः। (Yoga is the control of mind.) Calm thy mind, Seeker. Let us focus on " + topicTitle + " with steady attention. Your query: '" + userMessage + "' shows the mind seeking knowledge.";
            case "vivekananda":
                return "विवेकानन्द उवाच: उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत। (Arise, awake!) Have strength, Seeker! You are fully capable of mastering " + topicTitle + ". Regarding: '" + userMessage + "', believe in your inner potential and push forward!";
            case "chanakya":
                return "चाणक्य उवाच: निश्चितं यः समारभते नापवर्गं प्रबाधते। (Firm resolve leads to completion.) We must approach " + topicTitle + " strategically. Regarding: '" + userMessage + "', apply discipline and resourcefulness to solve it.";
            case "dronacharya":
            default:
                return "द्रोणाचार्य उवाच: उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः। (Tasks are accomplished by effort, not desires.) Focus your mind like Arjuna targeting the bird's eye! We are studying " + topicTitle + ". Regarding: '" + userMessage + "', analyze the core components of the problem strictly.";
        }
    }

    public String generateTutorResponse(String persona, String topicTitle, String notes, String videoMetadata, List<Map<String, String>> history, String userMessage) {
        try {
            String personaInstruction = getPersonaSystemInstruction(persona);
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append(personaInstruction).append("\n\n");
            promptBuilder.append("Context for the Seeker's Study Session:\n");
            promptBuilder.append("- Topic: ").append(topicTitle).append("\n");
            if (notes != null && !notes.trim().isEmpty()) {
                promptBuilder.append("- Seeker's Notes: ").append(notes).append("\n");
            }
            if (videoMetadata != null && !videoMetadata.trim().isEmpty()) {
                promptBuilder.append("- Video Metadata: ").append(videoMetadata).append("\n");
            }
            promptBuilder.append("\nChat History:\n");
            if (history != null) {
                for (Map<String, String> msg : history) {
                    promptBuilder.append(msg.get("role").toUpperCase()).append(": ").append(msg.get("content")).append("\n");
                }
            }
            promptBuilder.append("SEEKER: ").append(userMessage).append("\n");
            promptBuilder.append("ACHARYA: Response should start with or contain a relevant Sanskrit quote if possible, and maintain your persona tone.");

            return chatClient.prompt(promptBuilder.toString()).call().content();
        } catch (Exception e) {
            log.error("Failed to generate tutor chat response. Falling back to default response.", e);
            return getFallbackTutorResponse(persona, topicTitle, userMessage);
        }
    }
}

/**
 * Internal record to handle the structured JSON response from the LLM analysis.
 */
record AcharyaAnalysisResponse(
        String feedback,
        List<String> identifiedConcepts,
        List<String> gapSuggestions,
        Integer masteryScore,
        List<String> relevantTrials,
        List<String> recallQuestions
) {
    public AcharyaAnalysis toAcharyaAnalysis() {
        return new AcharyaAnalysis(feedback, identifiedConcepts, gapSuggestions, masteryScore, relevantTrials, recallQuestions != null ? recallQuestions : List.of());
    }
}

/**
 * Internal record for metadata discovery.
 */
record LessonDiscoveryResponse(String title, List<String> concepts, List<String> interviewQuestions) {}