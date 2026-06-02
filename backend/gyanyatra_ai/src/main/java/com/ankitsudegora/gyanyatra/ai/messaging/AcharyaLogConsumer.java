package com.ankitsudegora.gyanyatra.ai.messaging;

import com.ankitsudegora.gyanyatra.ai.service.AcharyaService;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import com.ankitsudegora.gyanyatra.core.repository.UserRepository;
import com.ankitsudegora.gyanyatra.core.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * The Service class that handles asynchronous Acharya Analysis and Karma distribution.
 * Now refactored to run with Spring's native @Async executor to remove the dependency on RabbitMQ.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class AcharyaLogConsumer {

    private final AcharyaService acharyaService;
    private final JournalService journalService;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    @Async
    public void processWisdomLog(Journal journal) {
        log.info("Acharya is starting asynchronous meditation on log: {}", journal.getId());
        try {
            Lesson lesson = acharyaService.identifyLessonFromUrl(journal.getVideoUrl());
            // 1. Generate Insight
            AcharyaAnalysis analysis = acharyaService.generateInsight(journal, lesson.getTitle());

            // 2. Persist dynamic grading and update Karma
            journalService.updateWithInsight(journal.getId(), analysis);
            updateSeekerKarma(journal.getUserId(), analysis.score());

            log.info("Acharya finished meditation and updated Karma for Seeker: {}", journal.getUserId());
        } catch (Exception e) {
            log.error("Error occurred during asynchronous Acharya meditation on log {}: {}", journal.getId(), e.getMessage(), e);
        }
    }

    /**
     * Updates the Seeker's total Karma points.
     */
    private void updateSeekerKarma(String userId, Integer newKarma) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().inc("totalKarmaPoints", newKarma);
        mongoTemplate.updateFirst(query, update, User.class);
    }
}