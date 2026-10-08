package com.tanujmethi.vector_service.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentDeleteRequest {
    private Long documentId;
    private Long companyId;
}
