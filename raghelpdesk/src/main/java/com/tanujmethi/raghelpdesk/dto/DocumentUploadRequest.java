package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.DocumentCategory;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentUploadRequest {
    private String title;
    private DocumentCategory category;
}
