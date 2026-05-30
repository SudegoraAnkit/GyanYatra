package com.ankitsudegora.gyanyatra.ai.exception;

import lombok.Getter;

/**
 * Exception thrown when YouTube API calls fail.
 */
@Getter
public class YouTubeApiException extends RuntimeException {

    private final String errorCode;
    private final int statusCode;

    public YouTubeApiException(String message) {
        super(message);
        this.errorCode = "YOUTUBE_API_ERROR";
        this.statusCode = 500;
    }

    public YouTubeApiException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "YOUTUBE_API_ERROR";
        this.statusCode = 500;
    }

    public YouTubeApiException(String message, String errorCode, int statusCode) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
    }

    public YouTubeApiException(String message, Throwable cause, String errorCode, int statusCode) {
        super(message, cause);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
    }

}
