package com.ankitsudegora.gyanyatra.core.repository;

import com.ankitsudegora.gyanyatra.core.model.UserActivity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserActivityRepository extends MongoRepository<UserActivity,String> {

}
