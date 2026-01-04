package com.ankitsudegora.gyanyatra.ai.service;


import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AcharyaServiceGemini {

    // The SDK Client - Should be bean-initialized in a Config class
    private final Client genAiClient;
    private final ObjectMapper objectMapper;

    @Value("${gyanyatra.google.genai.model}")
    private String modelId;

    private static final String SYSTEM_INSTRUCTION = "You are the Acharya, an elite Technical Guide. Evaluate Wisdom Logs for FAANG-level depth. Return ONLY valid JSON.";

    /**
     * Acharya Insight Sutra: Now using native Google SDK
     */
    @SneakyThrows
    public AcharyaAnalysis generateInsight(Journal journal, String lessonTitle) {
        String userPrompt = String.format(
                "Lesson: %s\nSeeker's Notes: %s\nEvaluate and provide feedback, identifiedConcepts, gapSuggestions, masteryScore (0-100), and relevantTrials.",
                lessonTitle, journal.getUserNotes()
        );

        GenerateContentConfig config = GenerateContentConfig.builder()
                .systemInstruction(Content.fromJson(SYSTEM_INSTRUCTION))
                .responseMimeType("application/json") // Enforces JSON mode natively
                .temperature(0.7F)
                .build();

        GenerateContentResponse response = genAiClient.models.generateContent(modelId, userPrompt, config);

        // Native SDK uses .text() for quick access to the content
        AcharyaAnalysisResponse dto = objectMapper.readValue(response.text(), AcharyaAnalysisResponse.class);
        return dto.toAcharyaAnalysis();
    }

    /**
     * Discovery Sutra: Identifying technical lessons from URLs
     */
    @SneakyThrows
    public Lesson identifyLessonFromUrl(String videoUrl) {
        String prompt = "Analyze this YouTube URL: " + videoUrl + ". Identify title and 3-5 core concepts. Return JSON.";

        GenerateContentConfig config = GenerateContentConfig.builder()
                .responseMimeType("application/json")
                .build();

        GenerateContentResponse response = genAiClient.models.generateContent(modelId, prompt, config);
        LessonDiscoveryResponse discovery = objectMapper.readValue(response.text(), LessonDiscoveryResponse.class);

        Lesson lesson = new Lesson();
        lesson.setTitle(discovery.title());
        lesson.setUrl(videoUrl);
        lesson.setConceptsCovered(discovery.concepts());
        return lesson;
    }
}
