package com.ankitsudegora.gyanyatra.core.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends GyanYatraException{
    public ResourceNotFoundException(String resource, String id) {
        super(String.format("%s with id %s not found", resource, id), "GY-404", HttpStatus.NOT_FOUND);
    }
}
