package com.ankitsudegora.gyanyatra.ai.mapper;


import com.ankitsudegora.gyanyatra.ai.dto.VideoMetadataDTO;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoSnippet;
import com.google.api.services.youtube.model.VideoStatistics;
import com.google.api.services.youtube.model.VideoTopicDetails;
import com.google.api.services.youtube.model.ThumbnailDetails;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Mapper class for converting YouTube API responses to DTOs.
 * Implements Adapter pattern to adapt YouTube API model to our domain model.
 */
@Component
public class VideoMetadataMapper {

    /**
     * Maps YouTube Video object to VideoMetadataDTO.
     *
     * @param video YouTube API video object
     * @param includeStatistics whether to include statistics
     * @param includeTopicDetails whether to include topic details
     * @param includeThumbnails whether to include thumbnails
     * @return mapped VideoMetadataDTO
     */
    public VideoMetadataDTO toDTO(Video video,
                                  boolean includeStatistics,
                                  boolean includeTopicDetails,
                                  boolean includeThumbnails) {
        if (video == null) {
            return null;
        }

        VideoMetadataDTO.VideoMetadataDTOBuilder builder = VideoMetadataDTO.builder()
                .videoId(video.getId());

        // Map snippet (always included)
        if (video.getSnippet() != null) {
            mapSnippet(builder, video.getSnippet(), includeThumbnails);
        }

        // Map statistics (optional)
        if (includeStatistics && video.getStatistics() != null) {
            mapStatistics(builder, video.getStatistics());
        }

        // Map topic details (optional)
        if (includeTopicDetails && video.getTopicDetails() != null) {
            mapTopicDetails(builder, video.getTopicDetails());
        }

        // Map content details
        if (video.getContentDetails() != null) {
            builder.duration(video.getContentDetails().getDuration())
                    .definition(video.getContentDetails().getDefinition())
                    .caption(video.getContentDetails().getCaption());
        }

        return builder.build();
    }

    /**
     * Maps video snippet information.
     */
    private void mapSnippet(VideoMetadataDTO.VideoMetadataDTOBuilder builder,
                            VideoSnippet snippet,
                            boolean includeThumbnails) {
        builder.title(snippet.getTitle())
                .description(snippet.getDescription())
                .channelId(snippet.getChannelId())
                .channelTitle(snippet.getChannelTitle())
                .categoryId(snippet.getCategoryId())
                .tags(snippet.getTags());

        // Convert published date
        if (snippet.getPublishedAt() != null) {
            LocalDateTime publishedAt = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(snippet.getPublishedAt().getValue()),
                    ZoneId.systemDefault()
            );
            builder.publishedAt(publishedAt);
        }

        // Map thumbnails if requested
        if (includeThumbnails && snippet.getThumbnails() != null) {
            builder.thumbnails(mapThumbnails(snippet.getThumbnails()));
        }
    }

    /**
     * Maps video statistics.
     */
    private void mapStatistics(VideoMetadataDTO.VideoMetadataDTOBuilder builder,
                               VideoStatistics statistics) {
        VideoMetadataDTO.Statistics stats = VideoMetadataDTO.Statistics.builder()
                .viewCount(statistics.getViewCount() != null ?
                        statistics.getViewCount().longValue() : null)
                .likeCount(statistics.getLikeCount() != null ?
                        statistics.getLikeCount().longValue() : null)
                .commentCount(statistics.getCommentCount() != null ?
                        statistics.getCommentCount().longValue() : null)
                .build();

        builder.statistics(stats);
    }

    /**
     * Maps topic details.
     */
    private void mapTopicDetails(VideoMetadataDTO.VideoMetadataDTOBuilder builder,
                                 VideoTopicDetails topicDetails) {
        builder.topicCategories(topicDetails.getTopicCategories());
    }

    /**
     * Maps thumbnail details.
     */
    private VideoMetadataDTO.ThumbnailInfo mapThumbnails(ThumbnailDetails thumbnails) {
        VideoMetadataDTO.ThumbnailInfo.ThumbnailInfoBuilder thumbnailBuilder =
                VideoMetadataDTO.ThumbnailInfo.builder();

        if (thumbnails.getDefault() != null) {
            thumbnailBuilder.defaultUrl(thumbnails.getDefault().getUrl());
        }
        if (thumbnails.getMedium() != null) {
            thumbnailBuilder.mediumUrl(thumbnails.getMedium().getUrl());
        }
        if (thumbnails.getHigh() != null) {
            thumbnailBuilder.highUrl(thumbnails.getHigh().getUrl());
        }
        if (thumbnails.getStandard() != null) {
            thumbnailBuilder.standardUrl(thumbnails.getStandard().getUrl());
        }
        if (thumbnails.getMaxres() != null) {
            thumbnailBuilder.maxResUrl(thumbnails.getMaxres().getUrl());
        }

        return thumbnailBuilder.build();
    }
}