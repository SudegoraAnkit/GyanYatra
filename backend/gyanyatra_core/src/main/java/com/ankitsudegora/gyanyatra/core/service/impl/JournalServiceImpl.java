package com.ankitsudegora.gyanyatra.core.service.impl;

import com.ankitsudegora.gyanyatra.core.exception.ResourceNotFoundException;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import com.ankitsudegora.gyanyatra.core.repository.JournalRepository;
import com.ankitsudegora.gyanyatra.core.service.JournalService;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Implementation of the WisdomLogService.
 * Annotated with @Service for Spring's component scanning.
 */
@Service
@RequiredArgsConstructor
class JournalServiceImpl implements JournalService {

    private final JournalRepository repository;

    @Override
    public Journal submitLog(Journal log) {
        // Business Rule: Check for duplicate submissions
        if (repository.existsByUserIdAndVideoUrl(log.getUserId(), log.getVideoUrl())) {
            // We will define DuplicateLogException in the Core Exception package
            throw new RuntimeException("This Satsang has already been logged in your Yatra.");
        }

        log.setCreatedAt(LocalDateTime.now());
        log.setVerified(false); // Awaiting Acharya's insight
        log.setNoteScore(0);    // Score starts at zero

        return repository.save(log);
    }

    @Override
    public void updateWithInsight(String logId, AcharyaAnalysis analysis) {
        Journal journal = repository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Wisdom Log", logId));

        journal.setNoteScore(analysis.score());
        journal.setVerified(true);
        // Assuming AiAnalysis is set by the AI module before calling this

        repository.save(journal);
    }

    @Override
    public @Nullable List<Journal> getRecentJournals(String userId) {
        return repository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public Optional<Journal> findById(String journalId) {
        return repository.findById(journalId);
    }
}
