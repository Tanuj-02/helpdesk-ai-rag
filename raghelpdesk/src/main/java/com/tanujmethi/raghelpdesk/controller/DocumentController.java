package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.ApiKeyRequest;
import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.dto.DocumentResponse;
import com.tanujmethi.raghelpdesk.dto.DocumentUploadRequest;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.enums.DocumentCategory;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import com.tanujmethi.raghelpdesk.service.file.DocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/admin/document")
public class DocumentController {
    private final DocumentService documentService;
    private final CurrentUserService currentUserService;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    public DocumentController(DocumentService documentService, CurrentUserService currentUserService, CompanyRepository companyRepository, PasswordEncoder passwordEncoder) {
        this.documentService = documentService;
        this.currentUserService = currentUserService;
        this.companyRepository = companyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestPart("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("category") DocumentCategory category
    ) throws IOException {

        DocumentUploadRequest request = new DocumentUploadRequest();
        request.setTitle(title);
        request.setCategory(category);

        DocumentResponse document =
                documentService.uploadDocument(file, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(document);
    }

    @GetMapping
    public List<DocumentResponse> getAllDocuments(){
        return documentService.getAllDocuments();
    }

    @GetMapping("/{id}")
    public DocumentResponse getDocumentById(@PathVariable Long id){
        return documentService.getDocumentById(id);
    }

    @DeleteMapping("/{id}")
    public DocumentResponse deleteDocumentById(@PathVariable Long id){
        return documentService.deleteDocumentById(id);
    }
}
