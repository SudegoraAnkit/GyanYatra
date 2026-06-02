package com.ankitsudegora.gyanyatra.api;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication
@ComponentScan(basePackages = "com.ankitsudegora.gyanyatra")
@EnableMongoRepositories(basePackages = "com.ankitsudegora.gyanyatra.core.repository")
@EnableMongoAuditing
@org.springframework.cache.annotation.EnableCaching
@org.springframework.scheduling.annotation.EnableAsync
public class GyanyatraApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(GyanyatraApiApplication.class, args);
	}


}
