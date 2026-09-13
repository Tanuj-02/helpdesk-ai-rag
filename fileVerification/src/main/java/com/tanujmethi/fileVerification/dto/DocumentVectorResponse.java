package com.tanujmethi.fileVerification.dto;

import lombok.*;

import java.util.List;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentVectorResponse {
    private String requestId;
    private Long documentId;
    private Long companyId;
    private String documentType;
    private String contentType;
    private List<DocumentChunk> documentChunks;
}
