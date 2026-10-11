package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.DocumentCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentUploadRequest {
    @NotBlank(message = "Document title is required")
    private String title;
    @NotNull(message = "Document category is required")
    private DocumentCategory category;
}
