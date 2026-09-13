package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentUploadEvent {
    private String requestId;
    private Long documentId;
    private Long companyId;
    private String documentType;
    private String contentType;
    private String s3Key;
}
