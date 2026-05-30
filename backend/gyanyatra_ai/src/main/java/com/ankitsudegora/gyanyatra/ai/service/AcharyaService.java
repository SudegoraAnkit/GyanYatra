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
           - If the topic is Technical/Coding/Systems Design: Evaluate based on software engineering standards (Time complexity, Edge cases, trade-offs). In 'relevantTrials', provide only valid LeetCode or GeeksforGeeks practice URLs.
           - If the topic is Productivity/Self-Help/Career/Soft Skills: Evaluate based on practical execution, habit building, and behavioral insights. In 'relevantTrials', provide actionable exercises or reading resources (e.g. "Try the 2-minute rule daily", "Read summary of Atomic Habits"). Do NOT provide coding/LeetCode links for non-technical topics.
        3. Tone: Encouraging but intellectually demanding.
        
        Provide your output in valid JSON format with:
        - feedback: A concise summary of their understanding.
        - identifiedConcepts: List of concepts (technical keywords or productivity principles) they correctly grasped.
        - gapSuggestions: Critical concepts or application details they missed or misunderstood.
        - masteryScore: An integer between 0 and 100 (Karma points).
        - relevantTrials: List of strings (relevant URLs or clear action items).
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
        try {
            PromptTemplate template = new PromptTemplate(ACHARYA_MAIN_PROMPT_TEMPLATE);
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
                                 combined.contains("2-minute") || combined.contains("productivity");
        
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
        } else {
            lesson.setConceptsCovered(List.of("Systems Design", "Software Engineering", "Scalability"));
            lesson.setInterviewQuestions(List.of(
                "What is the amortized time complexity of the operations in this system?",
                "How would you handle boundary cases or empty inputs for this approach?",
                "What are the core memory overhead or space complexity trade-offs?"
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
                                 combined.contains("2-minute") || combined.contains("productivity");

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
                trials.add("Try writing down your 2-minute rule checklist for the next 7 days");
                trials.add("Read summary of Atomic Habits by James Clear");
                score += 15;
            } else {
                gaps.add("Implementing complex productivity systems that cause burnout");
                trials.add("Read the Getting Things Done (GTD) framework summary");
                score += 5;
            }
        } else {
            if (notes.toLowerCase().contains("stack") || notes.toLowerCase().contains("queue")) {
                concepts.add("Stacks & Queues");
                concepts.add("Linear Data Structures");
                gaps.add("Space complexity overhead of double-stack queue implementations");
                trials.add("LeetCode 225: Implement Stack using Queues");
                trials.add("LeetCode 232: Implement Queue using Stacks");
                score += 15;
            } else if (notes.toLowerCase().contains("complexity") || notes.toLowerCase().contains("time") || notes.toLowerCase().contains("o(")) {
                concepts.add("Time Complexity Bounds");
                concepts.add("Big O Notation");
                gaps.add("Difference between amortized time bounds and worst-case bounds");
                trials.add("LeetCode 70: Climbing Stairs");
                score += 10;
            } else {
                concepts.add("Systems Engineering");
                concepts.add("Distributed Systems Design");
                gaps.add("Verify edge cases like network partitions and idempotent consumers");
                trials.add("LeetCode 1: Two Sum");
            }
        }

        if (notes.length() > 100) {
            score += 10;
        }
        score = Math.min(score, 100);

        String feedback = "Excellent effort! You have grasped the main concepts of " + lessonTitle + ". " +
                "Your notes show good understanding. To reach elite mastery, focus on consistency and practical implementation.";

        return new AcharyaAnalysis(feedback, concepts, gaps, score, trials);
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
        List<String> relevantTrials
) {
    public AcharyaAnalysis toAcharyaAnalysis() {
        return new AcharyaAnalysis(feedback, identifiedConcepts, gapSuggestions, masteryScore, relevantTrials);
    }
}

/**
 * Internal record for metadata discovery.
 */
record LessonDiscoveryResponse(String title, List<String> concepts, List<String> interviewQuestions) {}