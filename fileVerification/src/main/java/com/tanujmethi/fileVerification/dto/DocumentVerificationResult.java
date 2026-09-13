package com.tanujmethi.fileVerification.dto;

import lombok.*;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class DocumentVerificationResult {
    private boolean relevant;
    private boolean appropriate;
    private boolean helpdeskKnowledge;
    private double confidence;
    private String reason;
}
