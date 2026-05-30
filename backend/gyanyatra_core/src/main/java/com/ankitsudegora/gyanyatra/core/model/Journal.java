package com.ankitsudegora.gyanyatra.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "journals")
@Data
@Builder
@NoArgsConstructor  // <--- Mandatory for Jackson Deserialization
@AllArgsConstructor
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
    private Boolean isVerified;

}