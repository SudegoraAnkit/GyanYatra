package com.ankitsudegora.gyanyatra.core.model;

import com.ankitsudegora.gyanyatra.core.enums.ActivityType;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "user_activities")
@Data
public class UserActivity {
    @Id
    private String id;
    @Indexed
    private String userId;
    @Indexed private String lessonId;
    private ActivityType type;
    private LocalDateTime timestamp;
}
