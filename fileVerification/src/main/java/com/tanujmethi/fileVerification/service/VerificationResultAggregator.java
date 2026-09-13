package com.tanujmethi.fileVerification.service;

import com.tanujmethi.fileVerification.dto.DocumentVerificationResult;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class VerificationResultAggregator {

    public DocumentVerificationResult aggregate(
            List<DocumentVerificationResult> results
    ) {

        if (results == null || results.isEmpty()) {
            throw new IllegalArgumentException(
                    "No verification results available"
            );
        }

        long relevantCount = results.stream()
                .filter(DocumentVerificationResult::isRelevant)
                .count();

        long appropriateCount = results.stream()
                .filter(DocumentVerificationResult::isAppropriate)
                .count();

        long helpdeskCount = results.stream()
                .filter(DocumentVerificationResult::isHelpdeskKnowledge)
                .count();

        double averageConfidence =
                results.stream()
                        .mapToDouble(
                                DocumentVerificationResult::getConfidence
                        )
                        .average()
                        .orElse(0.0);

        boolean relevant =
                relevantCount >= Math.ceil(results.size() * 0.6);

        boolean appropriate =
                appropriateCount >= Math.ceil(results.size() * 0.6);

        boolean helpdeskKnowledge =
                helpdeskCount >= Math.ceil(results.size() * 0.6);

        String reason = results.stream()
                .map(DocumentVerificationResult::getReason)
                .filter(r -> r != null && !r.isBlank())
                .collect(Collectors.joining(" | "));

        return DocumentVerificationResult.builder()
                .relevant(relevant)
                .appropriate(appropriate)
                .helpdeskKnowledge(helpdeskKnowledge)
                .confidence(averageConfidence)
                .reason(reason)
                .build();
    }
}
