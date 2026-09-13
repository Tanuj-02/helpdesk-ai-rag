package com.tanujmethi.fileVerification.dto;

import lombok.*;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class DocumentVerificationRequest {
    private String requestId;
    private Long documentId;
    private Long companyId;
    private String documentType;
    private String contentType;
    private String s3Key;
}
