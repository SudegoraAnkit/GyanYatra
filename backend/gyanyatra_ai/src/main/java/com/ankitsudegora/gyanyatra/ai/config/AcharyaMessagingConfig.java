package com.ankitsudegora.gyanyatra.ai.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The Messaging Sutra for Gyan Yatra.
 * Handles the asynchronous flow between Wisdom Log submission and Acharya Analysis.
 */
@Configuration
public class AcharyaMessagingConfig {
    public static final String WISDOM_LOG_QUEUE = "yatra.wisdom.log.queue";

    @Bean
    public Queue wisdomLogQueue() {
        return new Queue(WISDOM_LOG_QUEUE, true);
    }
}