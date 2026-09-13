package com.tanujmethi.fileVerification.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalResultToHelpDesk {
    private String requestId;
    private Long documentId;
    private Long companyId;
    private boolean approved;
    private double confidence;
    private String reason;
}
