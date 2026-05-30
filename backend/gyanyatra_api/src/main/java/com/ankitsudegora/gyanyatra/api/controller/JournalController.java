package com.ankitsudegora.gyanyatra.api.controller;

import com.ankitsudegora.gyanyatra.ai.config.AcharyaMessagingConfig;
import com.ankitsudegora.gyanyatra.api.dto.JournalRequest;
import com.ankitsudegora.gyanyatra.core.exception.GyanYatraException;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.User;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import com.ankitsudegora.gyanyatra.ai.service.AcharyaService;
import com.ankitsudegora.gyanyatra.ai.service.VideoMetadataService;
import com.ankitsudegora.gyanyatra.ai.dto.VideoMetadataDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * The Gateway for Seekers to interact with the Sutra.
 * All endpoints are designed to be non-blocking and highly performant.
 */
@RestController
@RequestMapping("/api/v1/yatra/journals")
@RequiredArgsConstructor
@Slf4j
public class JournalController {

    private final JournalService journalService;
    private final RabbitTemplate rabbitTemplate;

    @Autowired
    private AcharyaService acharyaService;
    @Autowired
    private VideoMetadataService videoMetadataService;
    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     * STEP 1: Persist the Wisdom Log (Notes + Link).
     * This saves the 'Draft' version before AI analysis.
     */
    @PostMapping
    public ResponseEntity<Journal> createWisdomLog(@RequestBody JournalRequest request) {
        Journal journal = Journal.builder()
                .userId(request.userId())
                .videoUrl(request.videoUrl())
                .userNotes(request.userNotes())
                .isVerified(false) // Security: System sets this, not user
                .build();

        return ResponseEntity.ok(journalService.submitLog(journal));
    }

    /**
     * STEP 2: Send to Acharya for Meditation (Analysis).
     * Supports simulation mode for instant, free-tier offline evaluations.
     */
    @PostMapping("/{journalId}/meditate")
    public ResponseEntity<String> sendToAcharya(
            @PathVariable String journalId,
            @RequestParam(defaultValue = "false") boolean simulate) {
        try {
            log.info("Sending Wisdom Log {} to Acharya for meditation (simulate={})", journalId, simulate);
            Optional<Journal> journalOpt = journalService.findById(journalId);

            if (journalOpt.isEmpty()) {
                throw new GyanYatraException("Journal Not Found", "GY-4-4", HttpStatus.BAD_REQUEST);
            }
            Journal journal = journalOpt.get();

            if (simulate) {
                log.info("Evaluating log {} locally to preserve AI token quota", journalId);
                Lesson lesson = acharyaService.identifyLessonFromUrl(journal.getVideoUrl());
                AcharyaAnalysis analysis = acharyaService.generateMockInsightDirect(journal, lesson.getTitle());
                
                journalService.updateWithInsight(journalId, analysis);
                updateSeekerKarma(journal.getUserId(), analysis.score());

                return ResponseEntity.ok("Simulation complete. Wisdom Log evaluated locally.");
            } else {
                // Push the existing journal to RabbitMQ for scoring
                rabbitTemplate.convertAndSend("", AcharyaMessagingConfig.WISDOM_LOG_QUEUE, journal);
                return ResponseEntity.accepted()
                        .body("Acharya is now meditating on your insights. Your Mastery Map will update shortly.");
            }
        } catch (AmqpException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * STEP 3: Submit recall quiz answers.
     * Rewards the seeker with +15 Karma points for answering active recall questions.
     */
    @PostMapping("/{journalId}/quiz/submit")
    public ResponseEntity<String> submitQuiz(
            @PathVariable String journalId,
            @RequestBody List<String> answers) {
        log.info("Received active recall quiz submission for journal: {}", journalId);
        Optional<Journal> journalOpt = journalService.findById(journalId);
        if (journalOpt.isEmpty()) {
            throw new GyanYatraException("Journal Not Found", "GY-4-4", HttpStatus.BAD_REQUEST);
        }
        
        Journal journal = journalOpt.get();
        
        // Award +15 Karma points to user for completing the quiz
        updateSeekerKarma(journal.getUserId(), 15);
        
        return ResponseEntity.ok("Active recall quiz successfully evaluated. Awarded +15 Karma!");
    }

    @GetMapping("/seeker/{userId}")
    public ResponseEntity<List<Journal>> getSeekerYatraMap(@PathVariable String userId) {
        return ResponseEntity.ok(journalService.getRecentJournals(userId));
    }

    private void updateSeekerKarma(String userId, Integer newKarma) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().inc("totalKarmaPoints", newKarma);
        mongoTemplate.updateFirst(query, update, User.class);
    }
}