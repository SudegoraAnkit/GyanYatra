package com.ankitsudegora.gyanyatra.api;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {
		"com.ankitsudegora.gyanyatra.api",
		"com.ankitsudegora.gyanyatra.core",
		"com.ankitsudegora.gyanyatra.ai"
})
public class GyanyatraApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(GyanyatraApiApplication.class, args);
	}


}
