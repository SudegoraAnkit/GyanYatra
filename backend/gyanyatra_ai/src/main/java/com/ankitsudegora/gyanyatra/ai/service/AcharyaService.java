package com.ankitsudegora.gyanyatra.ai.service;

import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The Acharya Service is the 'Brain' of Gyan Yatra.
 * It transforms raw Wisdom Logs into structured architectural insights.
 */
@Service
@RequiredArgsConstructor
public class AcharyaService {

    private final ChatClient chatClient;

    /**
     * The Master Sutra (System Prompt) for the Acharya.
     * Designed to evaluate for FAANG-level conceptual depth and generate Trials (Practice Links).
     */
    private static final String ACHARYA_MAIN_PROMPT_TEMPLATE = """
        You are the Acharya, an elite Technical Guide for the Gyan Yatra.
        Your goal is to evaluate the Seeker's 'Wisdom Log' (notes) for the lesson: {lessonTitle}.
        
        Seeker's Notes: 
        {userNotes}
        
        Evaluation Guidelines:
        1. Context: The Seeker may use a mix of Hindi/English (Hinglish). Understand the intent.
        2. Rigor: Evaluate based on FAANG standards (Time complexity, Edge cases, System Design trade-offs).
        3. Tone: Encouraging but intellectually demanding.
        
        Provide your output in valid JSON format with:
        - feedback: A concise summary of their understanding.
        - identifiedConcepts: List of technical keywords they correctly grasped.
        - gapSuggestions: Critical concepts they missed or misunderstood.
        - masteryScore: An integer between 0 and 100 (Karma points).
        - relevantTrials: List of strings (LeetCode/GFG links related to this topic).
        """;

    /**
     * Prompt used to extract metadata when the Seeker provides only a URL.
     * This saves tokens by performing a specialized discovery.
     */
    private static final String ACHARYA_TOPIC_IDENTIFICATION_PROMPT = """
        Analyze this YouTube URL: {videoUrl}. 
        Identify the primary technical lesson (Satsang) title and the core concepts covered.
        
        Provide output in valid JSON:
        - title: Concise technical title.
        - concepts: List of 3-5 keywords.
        """;

    /**
     * Generates insights and FAANG Trials for the Seeker's log.
     */
    public AcharyaAnalysis generateInsight(Journal journal, String lessonTitle) {
        PromptTemplate template = new PromptTemplate(ACHARYA_MAIN_PROMPT_TEMPLATE);
        Prompt prompt = template.create(Map.of(
                "lessonTitle", lessonTitle,
                "userNotes", journal.getUserNotes()
        ));

        return Objects.requireNonNull(chatClient.prompt(prompt)
                        .call()
                        .entity(AcharyaAnalysisResponse.class))
                .toAcharyaAnalysis();
    }

    /**
     * Discovery Sutra: Transforms a raw URL into a structured Lesson object.
     * This bypasses the need for the YouTube API.
     */
    public Lesson identifyLessonFromUrl(String videoUrl) {
        PromptTemplate template = new PromptTemplate(ACHARYA_TOPIC_IDENTIFICATION_PROMPT);
        Prompt prompt = template.create(Map.of("videoUrl", videoUrl));

        LessonDiscoveryResponse discovery = Objects.requireNonNull(chatClient.prompt(prompt)
                .call()
                .entity(LessonDiscoveryResponse.class));

        Lesson lesson = new Lesson();
        lesson.setTitle(discovery.title());
        lesson.setUrl(videoUrl);
        lesson.setConceptsCovered(discovery.concepts());
        return lesson;
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
record LessonDiscoveryResponse(String title, List<String> concepts) {}