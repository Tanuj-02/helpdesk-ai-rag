package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class DocumentVerificationResultDto {
    private String requestId;
    private Long documentId;
    private Long companyId;
    private boolean approved;
    private double confidence;
    private String reason;
}
