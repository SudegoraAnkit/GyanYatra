package com.ankitsudegora.gyanyatra.core.repository;

import com.ankitsudegora.gyanyatra.core.model.SatsangYatra;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SatsangYatraRepository extends MongoRepository<SatsangYatra, String> {
    List<SatsangYatra> findByUserId(String userId);
    List<SatsangYatra> findByIsPublicTrue();
}
