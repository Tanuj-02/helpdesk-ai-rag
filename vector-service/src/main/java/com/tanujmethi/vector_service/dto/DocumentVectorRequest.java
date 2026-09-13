package com.tanujmethi.vector_service.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentVectorRequest {

    private String requestId;
    private Long documentId;
    private Long companyId;
    private String documentType;
    private String contentType;
    private List<DocumentChunk> documentChunks;
}
