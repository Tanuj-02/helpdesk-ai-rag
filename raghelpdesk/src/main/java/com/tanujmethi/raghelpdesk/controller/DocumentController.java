package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.DocumentResponse;
import com.tanujmethi.raghelpdesk.dto.DocumentUploadRequest;
import com.tanujmethi.raghelpdesk.enums.DocumentCategory;
import com.tanujmethi.raghelpdesk.service.file.DocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/admin/document")
public class DocumentController {
    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestPart("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("category") DocumentCategory category,
            Authentication authentication
    ) throws IOException {

        DocumentUploadRequest request = new DocumentUploadRequest();
        request.setTitle(title);
        request.setCategory(category);

        DocumentResponse document =
                documentService.uploadDocument(file, request, authentication);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(document);
    }
}
