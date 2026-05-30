package com.ankitsudegora.gyanyatra.ai.exception;

import lombok.Getter;

/**
 * Exception thrown when a video is not found on YouTube.
 */
@Getter
public class VideoNotFoundException extends RuntimeException {

    private final String videoId;

    public VideoNotFoundException(String videoId) {
        super("Video not found with ID: " + videoId);
        this.videoId = videoId;
    }

    public VideoNotFoundException(String videoId, String message) {
        super(message);
        this.videoId = videoId;
    }

}

