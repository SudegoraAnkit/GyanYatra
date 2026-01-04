package com.ankitsudegora.gyanyatra.api.controller;

import com.ankitsudegora.gyanyatra.ai.config.AcharyaMessagingConfig;
import com.ankitsudegora.gyanyatra.core.exception.GyanYatraException;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import com.ankitsudegora.gyanyatra.api.dto.JournalResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
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

    /**
     * STEP 1: Persist the Wisdom Log (Notes + Link).
     * This saves the 'Draft' version before AI analysis.
     */
    @PostMapping
    public ResponseEntity<Journal> createWisdomLog(@RequestBody Journal journal) {
        log.info("Recording new Wisdom Log for Seeker: {}", journal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(journalService.submitLog(journal));
    }

    /**
     * STEP 2: Send to Acharya for Meditation (Analysis).
     * This triggers the background process to calculate journalPoints.
     */
    @PostMapping("/{journalId}/meditate")
    public ResponseEntity<String> sendToAcharya(@PathVariable String journalId) {
        try {
            log.info("Sending Wisdom Log {} to Acharya for meditation", journalId);
            // We fetch the journal from DB to ensure it exists before queuing
            Optional<Journal> journal = journalService.findById(journalId);

            if(journal.isEmpty()){
                throw new GyanYatraException("Journal Not Found", "GY-4-4", HttpStatus.BAD_REQUEST);
            }
            // Push the existing journal to RabbitMQ for scoring
            rabbitTemplate.convertAndSend(AcharyaMessagingConfig.WISDOM_LOG_QUEUE, journal.get());

            return ResponseEntity.accepted()
                    .body("Acharya is now meditating on your insights. Your Mastery Map will update shortly.");
        } catch (AmqpException e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/seeker/{userId}")
    public ResponseEntity<List<Journal>> getSeekerYatraMap(@PathVariable String userId) {
        return ResponseEntity.ok(journalService.getRecentJournals(userId));
    }
}