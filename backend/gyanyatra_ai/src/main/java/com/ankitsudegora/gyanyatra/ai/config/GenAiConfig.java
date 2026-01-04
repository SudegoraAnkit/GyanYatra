package com.ankitsudegora.gyanyatra.ai.config;

import com.google.genai.Client;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GenAiConfig {
    @Bean
    public Client genAiClient(@Value("${gyanyatra.google.genai.api-key}") String apiKey) {
        return Client.builder()
                .apiKey(apiKey)
                .build();
    }
}
