package com.ankitsudegora.gyanyatra.ai.client;

import com.google.api.services.youtube.model.Video;

/**
 * Interface for YouTube API client operations.
 * Provides abstraction over YouTube API calls.
 */
public interface YouTubeClient {

    /**
     * Fetches video details by video ID.
     *
     * @param videoId the YouTube video ID
     * @param parts comma-separated list of parts to retrieve (e.g., "snippet,statistics,topicDetails")
     * @return Video object containing requested information
     */
    Video getVideoById(String videoId, String parts);

    /**
     * Checks if a video exists on YouTube.
     *
     * @param videoId the YouTube video ID
     * @return true if video exists, false otherwise
     */
    boolean videoExists(String videoId);
}
