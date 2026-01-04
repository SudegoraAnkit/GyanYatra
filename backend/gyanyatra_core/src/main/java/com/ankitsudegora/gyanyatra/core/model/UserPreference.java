package com.ankitsudegora.gyanyatra.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;

import java.util.List;

@Data
public class UserPreference{
    @Id
    private String id;
    private String level;
    private String currentRole;
    private List<String> targetRoles;
    private List<String> learningGoals;
    private List<String> preferredLearningStyles; 
    private List<String> areasOfImprovement;
    private List<String> topicsOfInterest;
    private List<String> skillLevels;
    private List<String> preferredContentTypes;
    private List<String> timeCommitments;
    private List<String> feedbackPreferences;
    private List<String> motivationFactors;
}