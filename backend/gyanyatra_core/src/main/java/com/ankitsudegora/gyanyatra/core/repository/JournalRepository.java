package com.ankitsudegora.gyanyatra.core.repository;

import com.ankitsudegora.gyanyatra.core.model.Journal;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JournalRepository extends MongoRepository<Journal, String> {

    // Optimized for the 'Yatra Map' dashboard
    List<Journal> findTop10ByUserIdOrderByCreatedAtDesc(String userId);

    // Check for duplicate logs in a specific Satsang to prevent Karma farming
    boolean existsByUserIdAndVideoUrl(String userId, String videoUrl);
}
