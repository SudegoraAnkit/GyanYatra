package com.ankitsudegora.gyanyatra.api.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatBeanConfig {
    /**
     * Create a ChatClient using SPECIFICALLY the Google Gemini ChatModel.
     */
    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
                .defaultSystem("You are a helpful AI assistant for Gyan Yatra.")
                .build();
    }

//    @Bean
//    public ChatClient chatClient(@Qualifier("openAiChatModel") ChatModel chatModel) {
//        return ChatClient.builder(chatModel)
//                .defaultSystem("You are a helpful AI assistant for Gyan Yatra.")
//                .build();
//    }
}
