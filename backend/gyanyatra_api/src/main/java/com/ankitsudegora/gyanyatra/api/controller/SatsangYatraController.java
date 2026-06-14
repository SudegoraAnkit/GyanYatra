package com.ankitsudegora.gyanyatra.api.controller;

import com.ankitsudegora.gyanyatra.ai.service.AcharyaService;
import com.ankitsudegora.gyanyatra.core.exception.GyanYatraException;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.SatsangYatra;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import com.ankitsudegora.gyanyatra.core.service.SatsangYatraService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/yatras")
@RequiredArgsConstructor
@Slf4j
public class SatsangYatraController {

    private final SatsangYatraService yatraService;
    private final AcharyaService acharyaService;
    private final JournalService journalService;

    @PostMapping
    public ResponseEntity<SatsangYatra> createYatra(
            HttpServletRequest request,
            @RequestBody SatsangYatra yatra) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(yatraService.createYatra(userId, yatra));
    }

    @GetMapping("/my")
    public ResponseEntity<List<SatsangYatra>> getMyYatras(HttpServletRequest request) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(yatraService.getMyYatras(userId));
    }

    @GetMapping("/public")
    public ResponseEntity<List<SatsangYatra>> getPublicYatras() {
        return ResponseEntity.ok(yatraService.getPublicYatras());
    }

    @GetMapping("/{yatraId}")
    public ResponseEntity<SatsangYatra> getYatraById(
            HttpServletRequest request,
            @PathVariable String yatraId) {
        String userId = (String) request.getAttribute("userId");
        SatsangYatra yatra = yatraService.getYatraById(yatraId, userId)
                .orElseThrow(() -> new GyanYatraException("Yatra not found", "GY-4-4", HttpStatus.NOT_FOUND));

        if (!yatra.isPublic() && (userId == null || !yatra.getUserId().equals(userId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(yatra);
    }

    @PutMapping("/{yatraId}")
    public ResponseEntity<SatsangYatra> updateYatra(
            HttpServletRequest request,
            @PathVariable String yatraId,
            @RequestBody SatsangYatra updatedYatra) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(yatraService.updateYatra(userId, yatraId, updatedYatra));
    }

    @DeleteMapping("/{yatraId}")
    public ResponseEntity<Void> deleteYatra(
            HttpServletRequest request,
            @PathVariable String yatraId) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        yatraService.deleteYatra(userId, yatraId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{yatraId}/topics/{topicId}/meditate")
    public ResponseEntity<SatsangYatra> meditateOnTopic(
            HttpServletRequest request,
            @PathVariable String yatraId,
            @PathVariable String topicId,
            @RequestParam(defaultValue = "dronacharya") String persona,
            @RequestParam(defaultValue = "false") boolean simulate) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        SatsangYatra yatra = yatraService.getYatraById(yatraId, userId)
                .orElseThrow(() -> new GyanYatraException("Yatra not found", "GY-4-4", HttpStatus.NOT_FOUND));

        if (!yatra.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        com.ankitsudegora.gyanyatra.core.model.YatraTopic target = yatraService.findTopicInYatra(yatra, topicId);
        if (target == null) {
            throw new GyanYatraException("Topic not found inside Yatra", "GY-4-4", HttpStatus.NOT_FOUND);
        }
        if (target.getUserNotes() == null || target.getUserNotes().trim().isEmpty()) {
            throw new GyanYatraException("Notes are mandatory to begin Acharya Meditation.", "GY-4-0", HttpStatus.BAD_REQUEST);
        }

        com.ankitsudegora.gyanyatra.core.model.Journal mockJournal = com.ankitsudegora.gyanyatra.core.model.Journal.builder()
                .userId(userId)
                .videoUrl(target.getVideoUrl())
                .userNotes(target.getUserNotes())
                .isVerified(false)
                .build();

        com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis analysis;
        if (simulate) {
            analysis = acharyaService.generateMockInsightDirect(mockJournal, target.getTitle());
        } else {
            analysis = acharyaService.generateInsight(mockJournal, target.getTitle(), persona);
        }

        // Persist as a verified Journal entry in MongoDB to update seeker streaks and journal history
        Journal realJournal = Journal.builder()
                .userId(userId)
                .videoUrl(target.getVideoUrl())
                .userNotes(target.getUserNotes())
                .isVerified(true)
                .aiAnalysis(analysis)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        try {
            journalService.submitLog(realJournal);
        } catch (Exception e) {
            log.error("Failed to persist custom Yatra meditation journal entry", e);
        }

        return ResponseEntity.ok(yatraService.saveTopicAnalysis(userId, yatraId, topicId, analysis));
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chatWithAcharya(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String persona = (String) body.getOrDefault("persona", "dronacharya");
        String topicTitle = (String) body.getOrDefault("topicTitle", "GyanYatra Lesson");
        String notes = (String) body.get("notes");
        String videoMetadata = (String) body.get("videoMetadata");
        List<Map<String, String>> history = (List<Map<String, String>>) body.get("history");
        String userMessage = (String) body.get("message");

        if (userMessage == null || userMessage.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }

        String tutorResponse = acharyaService.generateTutorResponse(
                persona, topicTitle, notes, videoMetadata, history, userMessage);

        return ResponseEntity.ok(Map.of("response", tutorResponse));
    }

    @PostMapping("/award-karma")
    public ResponseEntity<Map<String, String>> awardKarma(
            HttpServletRequest request,
            @RequestBody Map<String, Integer> body) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Integer points = body.getOrDefault("points", 15);
        yatraService.awardKarma(userId, points);
        return ResponseEntity.ok(Map.of("message", "Awarded " + points + " Karma points!"));
    }
}
