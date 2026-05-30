package com.ankitsudegora.gyanyatra.ai.messaging;

import com.ankitsudegora.gyanyatra.ai.config.AcharyaMessagingConfig;
import com.ankitsudegora.gyanyatra.ai.service.AcharyaService;
import com.ankitsudegora.gyanyatra.ai.service.AcharyaServiceGemini;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.model.Lesson;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import com.ankitsudegora.gyanyatra.core.repository.UserRepository;
import com.ankitsudegora.gyanyatra.core.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Consumer that facilitates the Karma Distribution.
 * Ensures that as the Acharya speaks, the Seeker's journey reflects the growth.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class AcharyaLogConsumer {

    private final AcharyaService acharyaService;
    private final JournalService journalService;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    @RabbitListener(queues = AcharyaMessagingConfig.WISDOM_LOG_QUEUE)
    public void processWisdomLog(Journal journal) {
        log.info("Acharya is starting meditation on: {}", journal.getId());
        Lesson lesson = acharyaService.identifyLessonFromUrl(journal.getVideoUrl());
        // 1. Generate Insight (This might fail if Gemini is down)
        AcharyaAnalysis analysis = acharyaService.generateInsight(journal, lesson.getTitle());

        // 2. Persist using the Atomic Increment pattern we discussed
        journalService.updateWithInsight(journal.getId(), analysis);
        updateSeekerKarma(journal.getUserId(), analysis.score());

        log.info("Acharya sealed the log for Seeker {}", journal.getUserId());

        // NOTE: We REMOVED the try-catch block here.
        // If this method throws an exception, Spring's retry logic kicks in automatically.
    }

    /**
     * Updates the Seeker's total Karma points.
     * Uses an atomic increment operation to ensure consistency for 20M users.
     */
    private void updateSeekerKarma(String userId, Integer newKarma) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().inc("totalKarmaPoints", newKarma);

        // This is one atomic operation in MongoDB. No need for @Transactional.
        mongoTemplate.updateFirst(query, update, User.class);
    }
}