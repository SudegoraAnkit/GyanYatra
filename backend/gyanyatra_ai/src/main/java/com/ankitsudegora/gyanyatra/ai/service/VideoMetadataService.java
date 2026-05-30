package com.ankitsudegora.gyanyatra.ai.service;


import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsRequest;
import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsResponse;
import com.ankitsudegora.gyanyatra.ai.dto.VideoMetadataDTO;

/**
 * Service interface for video metadata operations.
 * Provides high-level abstraction for video-related business logic.
 */
public interface VideoMetadataService {

    /**
     * Retrieves video metadata from a YouTube URL.
     *
     * @param request the video details request containing URL and options
     * @return video metadata response
     */
    VideoDetailsResponse getVideoMetadata(VideoDetailsRequest request);

    /**
     * Retrieves video metadata by video ID.
     *
     * @param videoId the YouTube video ID
     * @param includeStatistics whether to include statistics
     * @param includeTopicDetails whether to include topic details
     * @param includeThumbnails whether to include thumbnails
     * @return video metadata DTO
     */
    VideoMetadataDTO getVideoMetadataById(String videoId,
                                          boolean includeStatistics,
                                          boolean includeTopicDetails,
                                          boolean includeThumbnails);

    /**
     * Extracts video ID from a YouTube URL.
     *
     * @param url the YouTube video URL
     * @return extracted video ID
     */
    String extractVideoId(String url);

    /**
     * Checks if a video exists on YouTube.
     *
     * @param videoId the video ID to check
     * @return true if video exists, false otherwise
     */
    boolean videoExists(String videoId);
}
