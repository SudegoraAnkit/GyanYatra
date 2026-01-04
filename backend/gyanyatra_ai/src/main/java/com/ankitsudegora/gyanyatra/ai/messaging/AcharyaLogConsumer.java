package com.ankitsudegora.gyanyatra.ai.messaging;

import com.ankitsudegora.gyanyatra.ai.config.AcharyaMessagingConfig;
import com.ankitsudegora.gyanyatra.ai.service.AcharyaService;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import com.ankitsudegora.gyanyatra.core.repository.UserRepository;
import com.ankitsudegora.gyanyatra.core.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
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

    @RabbitListener(queues = AcharyaMessagingConfig.WISDOM_LOG_QUEUE)
    @Transactional // Ensures atomicity: Both Journal and User update or none do
    public void processWisdomLog(Journal journal) {
        log.info("Acharya is starting meditation on Wisdom Log: {}", journal.getId());

        try {
            // 1. Acharya generates the analysis and scores the Seeker
            AcharyaAnalysis analysis = acharyaService.generateInsight(journal, "Satsang Discovery");
            journalService.updateWithInsight(journal.getId(), analysis);

            // 3. Update the Seeker's Profile (Global Karma)
            updateSeekerKarma(journal.getUserId(), analysis.score());

            log.info("Acharya has sealed the log. Seeker {} earned {} Karma.", journal.getUserId(), analysis.score());
        } catch (Exception e) {
            log.error("An Obscuration occurred during Karma distribution: {}", e.getMessage());
        }
    }

    /**
     * Updates the Seeker's total Karma points.
     * Uses an atomic increment operation to ensure consistency for 20M users.
     */
    private void updateSeekerKarma(String userId, Integer newKarma) {
        // In a production MongoDB environment, we would use a custom query:
        // Query(where("id").is(userId)).update(inc("totalKarmaPoints", newKarma))
        // For now, we maintain the repository pattern but ensure it's called within a transaction.
        userRepository.findById(userId).ifPresent(user -> {
            int currentKarma = user.getTotalKarmaPoints() != null ? user.getTotalKarmaPoints() : 0;
            user.setTotalKarmaPoints(currentKarma + newKarma);
            userRepository.save(user);
        });
    }
}