package com.ankitsudegora.gyanyatra.core.service.impl;

import com.ankitsudegora.gyanyatra.core.exception.GyanYatraException;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import com.ankitsudegora.gyanyatra.core.model.SatsangYatra;
import com.ankitsudegora.gyanyatra.core.model.User;
import com.ankitsudegora.gyanyatra.core.model.YatraTopic;
import com.ankitsudegora.gyanyatra.core.repository.SatsangYatraRepository;
import com.ankitsudegora.gyanyatra.core.repository.UserRepository;
import com.ankitsudegora.gyanyatra.core.service.SatsangYatraService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class SatsangYatraServiceImpl implements SatsangYatraService {

    private final SatsangYatraRepository repository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    @Override
    public SatsangYatra createYatra(String userId, SatsangYatra yatra) {
        yatra.setUserId(userId);
        Optional<User> uOpt = userRepository.findById(userId);
        yatra.setUserName(uOpt.map(User::getName).orElse("Seeker"));
        yatra.setCreatedAt(LocalDateTime.now());
        yatra.setUpdatedAt(LocalDateTime.now());
        
        if (yatra.getTopics() == null) {
            yatra.setTopics(new ArrayList<>());
        }
        ensureTopicIdsAndDefaults(yatra.getTopics());
        return repository.save(yatra);
    }

    @Override
    public List<SatsangYatra> getMyYatras(String userId) {
        return repository.findByUserId(userId);
    }

    @Override
    public List<SatsangYatra> getPublicYatras() {
        return repository.findByIsPublicTrue();
    }

    @Override
    public Optional<SatsangYatra> getYatraById(String id) {
        return repository.findById(id);
    }

    @Override
    public SatsangYatra updateYatra(String userId, String id, SatsangYatra updatedYatra) {
        SatsangYatra existing = repository.findById(id)
                .orElseThrow(() -> new GyanYatraException("Yatra not found", "GY-4-4", HttpStatus.NOT_FOUND));

        if (!existing.getUserId().equals(userId)) {
            throw new GyanYatraException("Unauthorized to modify this Yatra", "GY-4-3", HttpStatus.FORBIDDEN);
        }

        existing.setTitle(updatedYatra.getTitle());
        existing.setDescription(updatedYatra.getDescription());
        existing.setPublic(updatedYatra.isPublic());
        existing.setUpdatedAt(LocalDateTime.now());
        
        List<YatraTopic> newTopics = updatedYatra.getTopics();
        if (newTopics == null) {
            newTopics = new ArrayList<>();
        }
        ensureTopicIdsAndDefaults(newTopics);
        existing.setTopics(newTopics);

        return repository.save(existing);
    }

    @Override
    public void deleteYatra(String userId, String id) {
        SatsangYatra existing = repository.findById(id)
                .orElseThrow(() -> new GyanYatraException("Yatra not found", "GY-4-4", HttpStatus.NOT_FOUND));

        if (!existing.getUserId().equals(userId)) {
            throw new GyanYatraException("Unauthorized to delete this Yatra", "GY-4-3", HttpStatus.FORBIDDEN);
        }

        repository.delete(existing);
    }

    @Override
    public SatsangYatra saveTopicAnalysis(String userId, String yatraId, String topicId, AcharyaAnalysis analysis) {
        SatsangYatra yatra = repository.findById(yatraId)
                .orElseThrow(() -> new GyanYatraException("Yatra not found", "GY-4-4", HttpStatus.NOT_FOUND));

        if (!yatra.getUserId().equals(userId)) {
            throw new GyanYatraException("Unauthorized to update this Yatra", "GY-4-3", HttpStatus.FORBIDDEN);
        }

        YatraTopic target = findTopicById(yatra.getTopics(), topicId);
        if (target == null) {
            throw new GyanYatraException("Topic not found inside Yatra", "GY-4-4", HttpStatus.NOT_FOUND);
        }

        target.setAiAnalysis(analysis);
        target.setStatus("done");

        // Reward Seeker with Karma
        updateSeekerKarma(userId, analysis.score());

        yatra.setUpdatedAt(LocalDateTime.now());
        return repository.save(yatra);
    }

    @Override
    public YatraTopic findTopicInYatra(SatsangYatra yatra, String topicId) {
        return findTopicById(yatra.getTopics(), topicId);
    }

    // Helper functions
    private void ensureTopicIdsAndDefaults(List<YatraTopic> topics) {
        if (topics == null) return;
        for (YatraTopic topic : topics) {
            if (topic.getId() == null || topic.getId().trim().isEmpty()) {
                topic.setId(UUID.randomUUID().toString());
            }
            if (topic.getStatus() == null || topic.getStatus().trim().isEmpty()) {
                topic.setStatus("not-started");
            }
            if (topic.getSubtopics() != null && !topic.getSubtopics().isEmpty()) {
                ensureTopicIdsAndDefaults(topic.getSubtopics());
            } else {
                topic.setSubtopics(new ArrayList<>());
            }
        }
    }

    private YatraTopic findTopicById(List<YatraTopic> topics, String id) {
        if (topics == null) return null;
        for (YatraTopic topic : topics) {
            if (topic.getId().equals(id)) {
                return topic;
            }
            YatraTopic found = findTopicById(topic.getSubtopics(), id);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    @Override
    public void awardKarma(String userId, int karmaPoints) {
        updateSeekerKarma(userId, karmaPoints);
    }

    private void updateSeekerKarma(String userId, Integer newKarma) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().inc("totalKarmaPoints", newKarma);
        mongoTemplate.updateFirst(query, update, User.class);
    }
}
