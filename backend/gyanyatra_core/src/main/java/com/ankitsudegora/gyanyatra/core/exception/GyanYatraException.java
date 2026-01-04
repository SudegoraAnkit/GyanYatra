package com.ankitsudegora.gyanyatra.core.exception;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.HttpStatus;

@Getter
@Setter
public class GyanYatraException extends RuntimeException{
    private final String errorCode;
    private final HttpStatus status;

    public GyanYatraException(String message, String errorCode, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }
}
