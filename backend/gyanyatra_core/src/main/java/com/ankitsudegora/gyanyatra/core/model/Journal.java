package com.ankitsudegora.gyanyatra.core.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "journals")
@Data
@Builder
public class Journal {
    @Id
    private String id;

    @Indexed
    private String userId;

    private String videoUrl;
    private String userNotes;
    private AcharyaAnalysis aiAnalysis;
    @CreatedDate
    private LocalDateTime createdAt;
    private Integer noteScore;
    private boolean isVerified;

}