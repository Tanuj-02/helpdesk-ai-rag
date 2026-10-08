package com.tanujmethi.raghelpdesk.service.file;

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
import com.tanujmethi.raghelpdesk.messaging.RabbitMqPublisher;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.swing.text.Document;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final AuthService authService;
    private final S3StorageService s3StorageService;
    private final CompanyDocumentRepository companyDocumentRepository;
    private final CompanyRepository companyRepository;
    private final FileValidationService fileValidationService;
    private final RabbitMqPublisher rabbitMqPublisher;
    private final CurrentUserService currentUserService;

    public DocumentService(AuthService authService, S3StorageService s3StorageService, CompanyDocumentRepository companyDocumentRepository, CompanyRepository companyRepository, FileValidationService fileValidationService, RabbitMqPublisher rabbitMqPublisher, CurrentUserService currentUserService) {
        this.authService = authService;
        this.s3StorageService = s3StorageService;
        this.companyDocumentRepository = companyDocumentRepository;
        this.companyRepository = companyRepository;
        this.fileValidationService = fileValidationService;
        this.rabbitMqPublisher = rabbitMqPublisher;
        this.currentUserService = currentUserService;
    }


    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest documentUploadRequest) throws IOException {


        if (!Role.ADMIN.name().equals(currentUserService.getRole())) {
            throw new AppException("Only Admin can see all users");
        }

        Long companyId = currentUserService.getCompanyId();

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

        rabbitMqPublisher.publish(request);

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

    public List<DocumentResponse> getAllDocuments() {
        Long companyId = currentUserService.getCompanyId();

        if(!currentUserService.getRole().equals(Role.ADMIN.toString())){
            throw new AppException("Ony admin can see documents");
        }

        List<CompanyDocument> documents = companyDocumentRepository.findByCompanyId(companyId);

        return documents.stream()
                .map(x -> DocumentResponse.builder()
                        .id(x.getId())
                        .title(x.getTitle())
                        .fileName(x.getFileName())
                        .companyId(companyId)
                        .fileSize(x.getFileSize())
                        .contentType(x.getContentType())
                        .category(x.getCategory())
                        .status(x.getStatus())
                        .rejectionReason(x.getRejectionReason())
                        .build())
                .toList();
    }

    public DocumentResponse getDocumentById(Long id) {
        if(!currentUserService.getRole().equals(Role.ADMIN.toString())){
            throw new AppException("Only admin can see documents");
        }
        Long companyId = currentUserService.getCompanyId();

        CompanyDocument document = companyDocumentRepository.findByIdAndCompanyId(id, companyId).orElseThrow();

        return DocumentResponse.builder()
                .id(id)
                .title(document.getTitle())
                .fileName(document.getFileName())
                .companyId(companyId)
                .fileSize(document.getFileSize())
                .contentType(document.getContentType())
                .category(document.getCategory())
                .status(document.getStatus())
                .rejectionReason(document.getRejectionReason())
                .build();
    }

    public DocumentResponse deleteDocumentById(Long id) {
        if(!currentUserService.getRole().equals(Role.ADMIN.toString())){
            throw new AppException("Only admin can see documents");
        }
        Long companyId = currentUserService.getCompanyId();

        CompanyDocument document = companyDocumentRepository.findByIdAndCompanyId(id, companyId).orElseThrow();

        document.setStatus(DocumentStatus.DELETED);
        s3StorageService.delete(document.getS3Key());

        companyDocumentRepository.save(document);

        return DocumentResponse.builder()
                .id(id)
                .title(document.getTitle())
                .fileName(document.getFileName())
                .companyId(companyId)
                .fileSize(document.getFileSize())
                .contentType(document.getContentType())
                .category(document.getCategory())
                .status(document.getStatus())
                .rejectionReason(document.getRejectionReason())
                .build();
    }
}
