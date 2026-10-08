package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VectorDocumentDeleteEvent {
    private Long documentId;
    private Long companyId;
}
