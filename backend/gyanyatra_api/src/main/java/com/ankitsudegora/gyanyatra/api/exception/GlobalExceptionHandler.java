package com.ankitsudegora.gyanyatra.api.exception;

import com.ankitsudegora.gyanyatra.ai.dto.VideoDetailsResponse;
import com.ankitsudegora.gyanyatra.ai.exception.InvalidVideoUrlException;
import com.ankitsudegora.gyanyatra.ai.exception.VideoNotFoundException;
import com.ankitsudegora.gyanyatra.ai.exception.YouTubeApiException;
import com.ankitsudegora.gyanyatra.core.exception.dto.ErrorResponse;
import com.ankitsudegora.gyanyatra.core.exception.GyanYatraException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(GyanYatraException.class)
    public ResponseEntity<ErrorResponse> handleGyanYatraException(GyanYatraException ex) {
        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                ex.getErrorCode(),
                LocalDateTime.now()
            );
        return new ResponseEntity<>(error, ex.getStatus());
    }

    // Catch-all for unexpected system errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unexpected error occurred", ex);
        ErrorResponse error = new ErrorResponse(
                "An unexpected error occurred. Our engineers (and AI) are on it!",
                "GY-500",
                LocalDateTime.now()
            );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(VideoNotFoundException.class)
    public ResponseEntity<VideoDetailsResponse> handleVideoNotFoundException(VideoNotFoundException ex) {
        log.error("Video not found: {}", ex.getVideoId(), ex);

        VideoDetailsResponse response = VideoDetailsResponse.error(
                ex.getMessage(),
                "VIDEO_NOT_FOUND"
            );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(InvalidVideoUrlException.class)
    public ResponseEntity<VideoDetailsResponse> handleInvalidVideoUrlException(InvalidVideoUrlException ex) {
        log.error("Invalid video URL: {}", ex.getUrl(), ex);

        VideoDetailsResponse response = VideoDetailsResponse.error(
                ex.getMessage(),
                "INVALID_URL"
            );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(YouTubeApiException.class)
    public ResponseEntity<VideoDetailsResponse> handleYouTubeApiException(YouTubeApiException ex) {
        log.error("YouTube API error: {}", ex.getMessage(), ex);

        VideoDetailsResponse response = VideoDetailsResponse.error(
                ex.getMessage(),
                ex.getErrorCode()
            );

        HttpStatus status = ex.getStatusCode() >= 400 && ex.getStatusCode() < 600 ?
                HttpStatus.valueOf(ex.getStatusCode()) : HttpStatus.INTERNAL_SERVER_ERROR;

        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException ex) {
        log.error("Validation error", ex);

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("errorCode", "VALIDATION_ERROR");
        response.put("message", "Validation failed");
        response.put("errors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

}
