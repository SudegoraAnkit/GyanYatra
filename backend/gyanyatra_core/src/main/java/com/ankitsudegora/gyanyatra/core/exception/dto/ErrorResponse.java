package com.ankitsudegora.gyanyatra.core.exception.dto;

import java.time.LocalDateTime;

public record ErrorResponse(String message, String code, LocalDateTime timestamp) {}
