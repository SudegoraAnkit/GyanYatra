package com.ankitsudegora.gyanyatra.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
2026-06-11
The recursive model for a custom study topic inside a SatsangYatra / Lakshya.
*/
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YatraTopic {
    private String id; // Unique topic/subtopic ID
    private String title;
    private String status; // "not-started", "in-progress", "done", "needs-revision"
    private int timeSpent; // time studied in seconds
    private int targetTime; // target time to complete in minutes
    private String videoUrl; // YouTube video URL
    private String userNotes; // User notes
    private AcharyaAnalysis aiAnalysis; // AI feedback review
    private List<YatraTopic> subtopics; // Recursive subtopics
}
