package com.ankitsudegora.gyanyatra.ai.service.impl;

import com.ankitsudegora.gyanyatra.ai.client.YouTubeClient;
import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsRequest;
import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsResponse;
import com.ankitsudegora.gyanyatra.ai.dto.VideoMetadataDTO;
import com.ankitsudegora.gyanyatra.ai.exception.InvalidVideoUrlException;
import com.ankitsudegora.gyanyatra.ai.exception.VideoNotFoundException;
import com.ankitsudegora.gyanyatra.ai.exception.YouTubeApiException;
import com.ankitsudegora.gyanyatra.ai.mapper.VideoMetadataMapper;
import com.ankitsudegora.gyanyatra.ai.service.VideoMetadataService;


import com.ankitsudegora.gyanyatra.ai.util.YouTubeUrlParser;
import com.google.api.services.youtube.model.Video;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

/**
 * Implementation of VideoMetadataService.
 * Orchestrates YouTube API calls, URL parsing, and data mapping.
 */
@Slf4j
@Service
@Validated
public class YouTubeVideoMetadataServiceImpl implements VideoMetadataService {

    private final YouTubeClient youTubeClient;
    private final YouTubeUrlParser urlParser;
    private final VideoMetadataMapper mapper;

    public YouTubeVideoMetadataServiceImpl(YouTubeClient youTubeClient,
                                           YouTubeUrlParser urlParser,
                                           VideoMetadataMapper mapper) {
        this.youTubeClient = youTubeClient;
        this.urlParser = urlParser;
        this.mapper = mapper;
    }

    @Override
    public VideoDetailsResponse getVideoMetadata(VideoDetailsRequest request) {
        log.info("Processing video metadata request for URL: {}", request.getVideoUrl());

        try {
            // Extract video ID from URL
            String videoId = extractVideoId(request.getVideoUrl());
            log.debug("Extracted video ID: {}", videoId);

            // Get video metadata
            VideoMetadataDTO metadata = getVideoMetadataById(
                    videoId,
                    request.isIncludeStatistics(),
                    request.isIncludeTopicDetails(),
                    request.isIncludeThumbnails()
            );

            log.info("Successfully retrieved metadata for video: {}", metadata.getTitle());
            return VideoDetailsResponse.success(metadata);

        } catch (InvalidVideoUrlException e) {
            log.error("Invalid video URL: {}", request.getVideoUrl(), e);
            return VideoDetailsResponse.error(e.getMessage(), "INVALID_URL");

        } catch (VideoNotFoundException e) {
            log.error("Video not found: {}", e.getVideoId(), e);
            return VideoDetailsResponse.error(e.getMessage(), "VIDEO_NOT_FOUND");

        } catch (YouTubeApiException e) {
            log.error("YouTube API error: {}", e.getMessage(), e);
            return VideoDetailsResponse.error(e.getMessage(), e.getErrorCode());

        } catch (Exception e) {
            log.error("Unexpected error processing video metadata request", e);
            return VideoDetailsResponse.error(
                    "An unexpected error occurred while processing the request",
                    "INTERNAL_ERROR"
            );
        }
    }

    @Override
    @Cacheable(value = "videoMetadata", key = "#videoId + '-' + #includeStatistics + '-' + #includeTopicDetails + '-' + #includeThumbnails")
    public VideoMetadataDTO getVideoMetadataById(String videoId,
                                                 boolean includeStatistics,
                                                 boolean includeTopicDetails,
                                                 boolean includeThumbnails) {
        log.debug("Fetching metadata for video ID: {}", videoId);

        // Validate video ID format
        if (!urlParser.isValidVideoId(videoId)) {
            throw new InvalidVideoUrlException(videoId, "Invalid video ID format");
        }

        // Build parts parameter based on requested data
        String parts = buildPartsParameter(includeStatistics, includeTopicDetails, includeThumbnails);
        log.debug("Requesting parts: {}", parts);

        // Fetch video from YouTube API
        Video video = youTubeClient.getVideoById(videoId, parts);

        // Map to DTO
        VideoMetadataDTO metadata = mapper.toDTO(
                video,
                includeStatistics,
                includeTopicDetails,
                includeThumbnails
        );

        return metadata;
    }

    @Override
    public String extractVideoId(String url) {
        log.debug("Extracting video ID from URL: {}", url);
        return urlParser.extractVideoId(url);
    }

    @Override
    public boolean videoExists(String videoId) {
        log.debug("Checking video existence for ID: {}", videoId);

        if (!urlParser.isValidVideoId(videoId)) {
            return false;
        }

        return youTubeClient.videoExists(videoId);
    }

    /**
     * Builds the parts parameter for YouTube API request based on requested options.
     */
    private String buildPartsParameter(boolean includeStatistics,
                                       boolean includeTopicDetails,
                                       boolean includeThumbnails) {
        List<String> parts = new ArrayList<>();

        // Snippet is always included (contains title, description, etc.)
        parts.add("snippet");

        // Content details for duration, definition, caption
        parts.add("contentDetails");

        if (includeStatistics) {
            parts.add("statistics");
        }

        if (includeTopicDetails) {
            parts.add("topicDetails");
        }

        return String.join(",", parts);
    }
}
