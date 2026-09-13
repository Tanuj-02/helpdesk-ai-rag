package com.tanujmethi.raghelpdesk.service.file;

import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.dto.DocumentResponse;
import com.tanujmethi.raghelpdesk.dto.DocumentUploadEvent;
import com.tanujmethi.raghelpdesk.dto.DocumentUploadRequest;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.CompanyDocument;
import com.tanujmethi.raghelpdesk.enums.DocumentStatus;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyDocumentRepository;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.service.S3StorageService;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
import com.tanujmethi.raghelpdesk.messaging.DocumentVerificationPublisher;
import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class DocumentService {

    private final AuthService authService;
    private final S3StorageService s3StorageService;
    private final CompanyDocumentRepository companyDocumentRepository;
    private final CompanyRepository companyRepository;
    private final FileValidationService fileValidationService;
    private final DocumentVerificationPublisher documentVerificationPublisher;

    public DocumentService(AuthService authService, S3StorageService s3StorageService, CompanyDocumentRepository companyDocumentRepository, CompanyRepository companyRepository, FileValidationService fileValidationService, DocumentVerificationPublisher documentVerificationPublisher) {
        this.authService = authService;
        this.s3StorageService = s3StorageService;
        this.companyDocumentRepository = companyDocumentRepository;
        this.companyRepository = companyRepository;
        this.fileValidationService = fileValidationService;
        this.documentVerificationPublisher = documentVerificationPublisher;
    }


    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest documentUploadRequest, Authentication authentication) throws IOException {
        CurrentUserResponse currentUser = authService.getCurrentUser(authentication);

        if(currentUser.getRole() != Role.ADMIN){
            throw new AppException("Only Admins can upload files");
        }

        Long companyId = currentUser.getCompanyId();

        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new AppException("Company not found")
        );

        fileValidationService.validate(file);

        CompanyDocument companyDocument = CompanyDocument.builder()
                .title(documentUploadRequest.getTitle())
                .fileName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .category(documentUploadRequest.getCategory())
                .status(DocumentStatus.UPLOADED)
                .company(company)
                .build();

        companyDocumentRepository.save(companyDocument);

        String s3Key = s3StorageService.upload(file, companyId, companyDocument.getId());

        companyDocument.setS3Key(s3Key);
        companyDocument.setStatus(DocumentStatus.UPLOADED);
        companyDocumentRepository.save(companyDocument);
        System.out.println("S3 KEY BEFORE PUBLISH: " + s3Key);
        DocumentUploadEvent request = DocumentUploadEvent.builder()
                .requestId(UUID.randomUUID().toString())
                .documentId(companyDocument.getId())
                .companyId(companyId)
                .contentType(companyDocument.getContentType())
                .documentType(companyDocument.getCategory().name())
                .s3Key(s3Key)
                .build();

        documentVerificationPublisher.publish(request);

        return DocumentResponse.builder()
                .id(companyDocument.getId())
                .title(companyDocument.getTitle())
                .fileName(companyDocument.getFileName())
                .companyId(companyDocument.getCompany().getId())
                .contentType(companyDocument.getContentType())
                .fileSize(companyDocument.getFileSize())
                .category(companyDocument.getCategory())
                .status(companyDocument.getStatus())
                .rejectionReason(companyDocument.getRejectionReason())
                .build();
    }
}
