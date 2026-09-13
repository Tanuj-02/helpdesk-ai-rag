package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.DocumentCategory;
import com.tanujmethi.raghelpdesk.enums.DocumentStatus;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {
    private Long id;
    private String title;
    private String fileName;
    private Long companyId;
    private String contentType;
    private Long fileSize;
    private DocumentCategory category;
    private DocumentStatus status;
    private String rejectionReason;
}
