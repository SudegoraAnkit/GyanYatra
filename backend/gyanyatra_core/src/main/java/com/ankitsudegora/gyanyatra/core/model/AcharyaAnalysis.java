package com.ankitsudegora.gyanyatra.core.model;

import java.util.List;

public record AcharyaAnalysis(
        String feedback,
        List<String> identifiedConcepts,
        List<String> gapSuggestions,
        Integer score,
        List<String> relevantTrials) {}