package com.ankitsudegora.gyanyatra.ai.util;


import com.ankitsudegora.gyanyatra.ai.exception.InvalidVideoUrlException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for parsing YouTube video URLs.
 * Implements Strategy pattern for different URL formats.
 */
@Component
public class YouTubeUrlParser {

    private final List<UrlParsingStrategy> strategies;

    public YouTubeUrlParser() {
        this.strategies = Arrays.asList(
                new WatchUrlStrategy(),
                new ShortUrlStrategy(),
                new EmbedUrlStrategy(),
                new ShortsUrlStrategy(),
                new MobileUrlStrategy()
        );
    }

    /**
     * Extracts video ID from a YouTube URL.
     *
     * @param url YouTube video URL
     * @return extracted video ID
     * @throws InvalidVideoUrlException if URL is invalid or video ID cannot be extracted
     */
    public String extractVideoId(String url) {
        if (url == null || url.isBlank()) {
            throw new InvalidVideoUrlException(url, "URL cannot be null or empty");
        }

        String normalizedUrl = url.trim();

        for (UrlParsingStrategy strategy : strategies) {
            Optional<String> videoId = strategy.extractVideoId(normalizedUrl);
            if (videoId.isPresent()) {
                return videoId.get();
            }
        }

        throw new InvalidVideoUrlException(url, "Could not extract video ID from URL");
    }

    /**
     * Validates if a string is a valid YouTube video ID.
     *
     * @param videoId the video ID to validate
     * @return true if valid, false otherwise
     */
    public boolean isValidVideoId(String videoId) {
        if (videoId == null || videoId.isBlank()) {
            return false;
        }
        // YouTube video IDs are typically 11 characters long
        return videoId.matches("^[a-zA-Z0-9_-]{11}$");
    }

    /**
     * Strategy interface for different URL parsing approaches.
     */
    private interface UrlParsingStrategy {
        Optional<String> extractVideoId(String url);
    }

    /**
     * Strategy for standard YouTube watch URLs: youtube.com/watch?v=VIDEO_ID
     */
    private static class WatchUrlStrategy implements UrlParsingStrategy {
        private static final Pattern PATTERN = Pattern.compile(
                "(?:youtube\\.com/watch\\?v=)([a-zA-Z0-9_-]{11})"
        );

        @Override
        public Optional<String> extractVideoId(String url) {
            try {
                if (url.contains("youtube.com/watch")) {
                    URI uri = new URI(url);
                    String query = uri.getQuery();
                    if (query != null) {
                        String[] params = query.split("&");
                        for (String param : params) {
                            String[] keyValue = param.split("=");
                            if (keyValue.length == 2 && "v".equals(keyValue[0])) {
                                String videoId = URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8);
                                return Optional.of(videoId);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // Try regex as fallback
                Matcher matcher = PATTERN.matcher(url);
                if (matcher.find()) {
                    return Optional.of(matcher.group(1));
                }
            }
            return Optional.empty();
        }
    }

    /**
     * Strategy for short YouTube URLs: youtu.be/VIDEO_ID
     */
    private static class ShortUrlStrategy implements UrlParsingStrategy {
        private static final Pattern PATTERN = Pattern.compile(
                "(?:youtu\\.be/)([a-zA-Z0-9_-]{11})"
        );

        @Override
        public Optional<String> extractVideoId(String url) {
            Matcher matcher = PATTERN.matcher(url);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
            return Optional.empty();
        }
    }

    /**
     * Strategy for embedded YouTube URLs: youtube.com/embed/VIDEO_ID
     */
    private static class EmbedUrlStrategy implements UrlParsingStrategy {
        private static final Pattern PATTERN = Pattern.compile(
                "(?:youtube\\.com/embed/)([a-zA-Z0-9_-]{11})"
        );

        @Override
        public Optional<String> extractVideoId(String url) {
            Matcher matcher = PATTERN.matcher(url);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
            return Optional.empty();
        }
    }

    /**
     * Strategy for YouTube Shorts URLs: youtube.com/shorts/VIDEO_ID
     */
    private static class ShortsUrlStrategy implements UrlParsingStrategy {
        private static final Pattern PATTERN = Pattern.compile(
                "(?:youtube\\.com/shorts/)([a-zA-Z0-9_-]{11})"
        );

        @Override
        public Optional<String> extractVideoId(String url) {
            Matcher matcher = PATTERN.matcher(url);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
            return Optional.empty();
        }
    }

    /**
     * Strategy for mobile YouTube URLs: m.youtube.com/watch?v=VIDEO_ID
     */
    private static class MobileUrlStrategy implements UrlParsingStrategy {
        private static final Pattern PATTERN = Pattern.compile(
                "(?:m\\.youtube\\.com/watch\\?v=)([a-zA-Z0-9_-]{11})"
        );

        @Override
        public Optional<String> extractVideoId(String url) {
            Matcher matcher = PATTERN.matcher(url);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
            return Optional.empty();
        }
    }
}
