package com.ankitsudegora.gyanyatra.api.controller;


import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsRequest;
import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsResponse;
import com.ankitsudegora.gyanyatra.ai.dto.VideoMetadataDTO;
import com.ankitsudegora.gyanyatra.ai.service.VideoMetadataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for video metadata operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
@Tag(name = "Video Metadata", description = "APIs for retrieving YouTube video metadata")
public class VideoMetadataController {

    private final VideoMetadataService videoMetadataService;

    @PostMapping("/metadata")
    @Operation(
            summary = "Get video metadata",
            description = "Retrieves metadata for a YouTube video from its URL",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Successfully retrieved video metadata",
                            content = @Content(schema = @Schema(implementation = VideoDetailsResponse.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "Invalid request"),
                    @ApiResponse(responseCode = "404", description = "Video not found"),
                    @ApiResponse(responseCode = "500", description = "Internal server error")
            }
    )
    public ResponseEntity<VideoDetailsResponse> getVideoMetadata(
            @Valid @RequestBody VideoDetailsRequest request) {

        log.info("Received request to fetch video metadata for URL: {}", request.getVideoUrl());

        VideoDetailsResponse response = videoMetadataService.getVideoMetadata(request);

        HttpStatus status = response.isSuccess() ? HttpStatus.OK :
                "VIDEO_NOT_FOUND".equals(response.getErrorCode()) ?
                        HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/{videoId}")
    @Operation(
            summary = "Get video metadata by ID",
            description = "Retrieves metadata for a YouTube video using its video ID",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Successfully retrieved video metadata",
                            content = @Content(schema = @Schema(implementation = VideoMetadataDTO.class))
                    ),
                    @ApiResponse(responseCode = "404", description = "Video not found"),
                    @ApiResponse(responseCode = "500", description = "Internal server error")
            }
    )
    public ResponseEntity<VideoMetadataDTO> getVideoMetadataById(
            @Parameter(description = "YouTube video ID", required = true)
            @PathVariable String videoId,

            @Parameter(description = "Include video statistics")
            @RequestParam(defaultValue = "false") boolean includeStatistics,

            @Parameter(description = "Include topic details")
            @RequestParam(defaultValue = "false") boolean includeTopicDetails,

            @Parameter(description = "Include thumbnail URLs")
            @RequestParam(defaultValue = "false") boolean includeThumbnails) {

        log.info("Received request to fetch video metadata for video ID: {}", videoId);

        VideoMetadataDTO metadata = videoMetadataService.getVideoMetadataById(
                videoId,
                includeStatistics,
                includeTopicDetails,
                includeThumbnails
        );

        return ResponseEntity.ok(metadata);
    }

    @GetMapping("/extract-id")
    @Operation(
            summary = "Extract video ID from URL",
            description = "Extracts the video ID from a YouTube URL",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Successfully extracted video ID"
                    ),
                    @ApiResponse(responseCode = "400", description = "Invalid URL")
            }
    )
    public ResponseEntity<String> extractVideoId(
            @Parameter(description = "YouTube video URL", required = true)
            @RequestParam String url) {

        log.info("Received request to extract video ID from URL: {}", url);

        String videoId = videoMetadataService.extractVideoId(url);

        return ResponseEntity.ok(videoId);
    }

    @GetMapping("/{videoId}/exists")
    @Operation(
            summary = "Check if video exists",
            description = "Checks if a video exists on YouTube",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Successfully checked video existence"
                    )
            }
    )
    public ResponseEntity<Boolean> checkVideoExists(
            @Parameter(description = "YouTube video ID", required = true)
            @PathVariable String videoId) {

        log.info("Received request to check if video exists: {}", videoId);

        boolean exists = videoMetadataService.videoExists(videoId);

        return ResponseEntity.ok(exists);
    }
}

