package com.ankitsudegora.gyanyatra.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

/**
2026-06-11
The custom SatsangYatra / Lakshya curriculum created and followed by seekers.
*/
@Document(collection = "satsang_yatras")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SatsangYatra {
    @Id
    private String id;
    private String userId; // Creator ID
    private String userName; // Creator name
    private String title;
    private String description;
    private boolean isPublic;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<YatraTopic> topics; // Root level topics
}
