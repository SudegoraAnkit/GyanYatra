package com.ankitsudegora.gyanyatra.ai.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
//import com.google.genai.Client;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GenAiConfig {
//    @Bean
//    public Client genAiClient(@Value("${gyanyatra.google.genai.api-key}") String apiKey) {
//        return Client.builder()
//                .apiKey(apiKey)
//                .build();
//    }

    @Bean
    public ObjectMapper objectMapper() {
        // High-performance, fail-safe configuration
        return new ObjectMapper()
                .registerModule(new JavaTimeModule()) // Handles LocalDateTime in your Models
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
