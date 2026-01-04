package com.ankitsudegora.gyanyatra.core.exception;

import org.springframework.http.HttpStatus;

public class AiProcessingException extends GyanYatraException{
    public AiProcessingException(String detail) {
        super("Acharya is currently unavailable: " + detail, "GY-AI-500", HttpStatus.SERVICE_UNAVAILABLE);
    }
}
