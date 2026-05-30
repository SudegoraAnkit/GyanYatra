package com.ankitsudegora.gyanyatra.ai.exception;

import lombok.Getter;

/**
 * Exception thrown when an invalid YouTube video URL is provided.
 */
@Getter
public class InvalidVideoUrlException extends RuntimeException {

    private final String url;

    public InvalidVideoUrlException(String url) {
        super("Invalid YouTube video URL: " + url);
        this.url = url;
    }

    public InvalidVideoUrlException(String url, String message) {
        super(message);
        this.url = url;
    }

}
