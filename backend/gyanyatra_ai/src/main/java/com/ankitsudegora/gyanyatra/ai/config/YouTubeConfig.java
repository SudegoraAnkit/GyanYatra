package com.ankitsudegora.gyanyatra.ai.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.security.GeneralSecurityException;

import java.security.GeneralSecurityException;

/**
 * Configuration class for YouTube API client setup.
 * Uses Singleton pattern through Spring's bean management.
 */
@Configuration
public class YouTubeConfig {

    @Value("${youtube.api.key}")
    private String apiKey;

    @Value("${youtube.api.application-name:GyanYatra}")
    private String applicationName;

    /**
     * Creates and configures a YouTube API client bean.
     * This bean is singleton-scoped by default in Spring.
     *
     * @return configured YouTube client instance
     * @throws GeneralSecurityException if security setup fails
     * @throws IOException if HTTP transport initialization fails
     */
    @Bean
    public YouTube youTubeClient() throws GeneralSecurityException, IOException {
        final NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        final JsonFactory jsonFactory = GsonFactory.getDefaultInstance();

        return new YouTube.Builder(httpTransport, jsonFactory, null)
                .setApplicationName(applicationName)
                .build();
    }

    /**
     * Provides the YouTube API key as a bean for dependency injection.
     *
     * @return YouTube API key
     */
    @Bean
    public String youTubeApiKey() {
        return apiKey;
    }
}
