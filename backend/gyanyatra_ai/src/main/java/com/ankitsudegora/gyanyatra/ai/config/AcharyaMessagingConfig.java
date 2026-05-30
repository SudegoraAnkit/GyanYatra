package com.ankitsudegora.gyanyatra.ai.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.DefaultJacksonJavaTypeMapper;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The Messaging Sutra for Gyan Yatra.
 * Handles the asynchronous flow between Wisdom Log submission and Acharya Analysis.
 */
@Configuration
public class AcharyaMessagingConfig {

    public static final String WISDOM_LOG_QUEUE = "gyanyatra.wisdom.log.queue";
    public static final String DLX_EXCHANGE = "gyanyatra.deadletter.exchange";
    public static final String DLQ_QUEUE = "gyanyatra.wisdom.log.dlq";

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLX_EXCHANGE);
    }

    @Bean
    public Queue deadLetterQueue() {
        return new Queue(DLQ_QUEUE);
    }

    @Bean
    public Binding dlqBinding() {
        return BindingBuilder.bind(deadLetterQueue()).to(deadLetterExchange()).with("dead.letter");
    }

    @Bean
    public Queue wisdomLogQueue() {
        return QueueBuilder.durable(WISDOM_LOG_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead.letter")
                .build();
    }

    @Bean
    public JacksonJsonMessageConverter messageConverter() {
        JacksonJsonMessageConverter converter = new JacksonJsonMessageConverter();

        // Use the new TypeMapper that supports Jackson 3
        DefaultJacksonJavaTypeMapper typeMapper = new DefaultJacksonJavaTypeMapper();
        // Security Rule: Only allow your domain packages to be deserialized
        typeMapper.setTrustedPackages("com.ankitsudegora.gyanyatra.*");
        converter.setJavaTypeMapper(typeMapper);

        return converter;
    }
}