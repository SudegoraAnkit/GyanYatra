package com.ankitsudegora.gyanyatra.api.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatBeanConfig {
    /**
     * Define the ChatClient bean.
     * Spring AI provides the ChatClient.Builder automatically based on
     * the Gemini starter present in the classpath.
     */
    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder.build();
    }

    /**
     * Define the ChatClient.Builder bean explicitly.
     * This uses the ChatModel (Gemini/OpenAI) provided by the starter.
     */
    @Bean
    public ChatClient.Builder chatClientBuilder(ChatModel chatModel) {
        return ChatClient.builder(chatModel);
    }
}
