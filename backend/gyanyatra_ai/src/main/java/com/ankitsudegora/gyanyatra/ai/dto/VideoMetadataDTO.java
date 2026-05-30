package com.ankitsudegora.gyanyatra.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Object for video metadata.
 * Uses Builder pattern for flexible object construction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VideoMetadataDTO {

    private String videoId;
    private String title;
    private String description;
    private String channelId;
    private String channelTitle;
    private LocalDateTime publishedAt;
    private List<String> tags;
    private String categoryId;
    private List<String> topicCategories;
    private ThumbnailInfo thumbnails;
    private Statistics statistics;
    private String duration;
    private String definition;
    private String caption;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThumbnailInfo {
        private String defaultUrl;
        private String mediumUrl;
        private String highUrl;
        private String standardUrl;
        private String maxResUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Statistics {
        private Long viewCount;
        private Long likeCount;
        private Long commentCount;
    }
}