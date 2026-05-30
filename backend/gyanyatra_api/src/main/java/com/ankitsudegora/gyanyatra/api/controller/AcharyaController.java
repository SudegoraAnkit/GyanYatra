package com.ankitsudegora.gyanyatra.api.controller;

import com.ankitsudegora.gyanyatra.ai.service.AcharyaService;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Diagnostic Controller for the Acharya.
 * Allows for manual triggering of AI analysis if needed.
 */
@RestController
@RequestMapping("/api/v1/yatra/acharya")
@RequiredArgsConstructor
public class AcharyaController {

    private final AcharyaService acharyaService;

    /**
     * Test the Acharya's wisdom without saving to the DB.
     */
    @PostMapping("/test-insight")
    public ResponseEntity<AcharyaAnalysis> testMeditation(
            @RequestBody Journal journal,
            @RequestParam String lessonTitle) {
        return ResponseEntity.ok(acharyaService.generateInsight(journal, lessonTitle));
    }

    /**
     * Discovery: Use AI to identify the Satsang topic from the URL or notes.
     * Use this when the Seeker hasn't provided a title.
     */
    @PostMapping("/discover-topic")
    public ResponseEntity<Lesson> discoverSatsangTopic(@RequestBody String videoUrl) {
        // AI logic here would prompt: "Identify the technical topic of this YouTube link: {videoUrl}"
        // This removes the dependency on Google/YouTube API keys.
        Lesson identifiedTopic = acharyaService.identifyLessonFromUrl(videoUrl);
        return ResponseEntity.ok(identifiedTopic);
    }

}
