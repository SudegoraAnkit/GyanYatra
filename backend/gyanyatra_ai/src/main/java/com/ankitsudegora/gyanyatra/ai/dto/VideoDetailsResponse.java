package com.ankitsudegora.gyanyatra.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response wrapper for video details.
 * Provides additional metadata about the API response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VideoDetailsResponse {

    private boolean success;
    private String message;
    private VideoMetadataDTO data;
    private LocalDateTime timestamp;
    private String errorCode;

    /**
     * Creates a successful response.
     */
    public static VideoDetailsResponse success(VideoMetadataDTO data) {
        return VideoDetailsResponse.builder()
                .success(true)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Creates an error response.
     */
    public static VideoDetailsResponse error(String message, String errorCode) {
        return VideoDetailsResponse.builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .timestamp(LocalDateTime.now())
                .build();
    }
}