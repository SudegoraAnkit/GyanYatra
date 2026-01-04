package com.ankitsudegora.gyanyatra.core.service;

import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.Journal;
import org.jspecify.annotations.Nullable;

import java.util.List;
import java.util.Optional;

/**
 * The Domain Service for Wisdom Logs.
 * This is the 'Sutra' that connects the Seeker to their knowledge.
 */
public interface JournalService {
    Journal submitLog(Journal log);
    void updateWithInsight(String logId, AcharyaAnalysis analysis);
    @Nullable List<Journal> getRecentJournals(String userId);
    Optional<Journal> findById(String journalId);
}
