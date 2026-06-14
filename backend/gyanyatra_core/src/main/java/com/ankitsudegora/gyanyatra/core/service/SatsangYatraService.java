package com.ankitsudegora.gyanyatra.core.service;

import com.ankitsudegora.gyanyatra.core.model.SatsangYatra;
import com.ankitsudegora.gyanyatra.core.model.YatraTopic;
import com.ankitsudegora.gyanyatra.core.model.AcharyaAnalysis;
import java.util.List;
import java.util.Optional;

public interface SatsangYatraService {
    SatsangYatra createYatra(String userId, SatsangYatra yatra);
    List<SatsangYatra> getMyYatras(String userId);
    List<SatsangYatra> getPublicYatras();
    Optional<SatsangYatra> getYatraById(String id, String userId);
    SatsangYatra updateYatra(String userId, String id, SatsangYatra updatedYatra);
    void deleteYatra(String userId, String id);
    SatsangYatra saveTopicAnalysis(String userId, String yatraId, String topicId, AcharyaAnalysis analysis);
    YatraTopic findTopicInYatra(SatsangYatra yatra, String topicId);
    void awardKarma(String userId, int karmaPoints);
}
