package com.ankitsudegora.gyanyatra.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for video details retrieval.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoDetailsRequest {

    @NotBlank(message = "Video URL cannot be blank")
    private String videoUrl;

    private boolean includeStatistics;
    private boolean includeTopicDetails;
    private boolean includeThumbnails;
}

