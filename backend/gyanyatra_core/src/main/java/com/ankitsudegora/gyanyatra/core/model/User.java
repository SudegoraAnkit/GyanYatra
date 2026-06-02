package com.ankitsudegora.gyanyatra.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "users")
@Data
public class User{
    @Id
    private String id;
    private String name;
    private String email;
    private String passwordHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserPreference userPreferences;

    @org.springframework.data.mongodb.core.index.Indexed(direction = org.springframework.data.mongodb.core.index.IndexDirection.DESCENDING)
    private Integer totalKarmaPoints;
    private String bio;
    private java.util.List<String> additionalSkills;

    @org.springframework.data.annotation.Transient
    private String token;
}