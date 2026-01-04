package com.ankitsudegora.gyanyatra.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "lessons")
@Data
public class Lesson {
    @Id
    private String id;
    private String title;
    private String url;
    private List<String> conceptsCovered;
    private List<String> interviewQuestions;
}