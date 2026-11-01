package com.tanujmethi.raghelpdesk.messaging;

import com.tanujmethi.raghelpdesk.dto.DocumentVerificationResultDto;
import com.tanujmethi.raghelpdesk.dto.VectorDocumentDeleteEvent;
import com.tanujmethi.raghelpdesk.entity.CompanyDocument;
import com.tanujmethi.raghelpdesk.enums.DocumentStatus;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyDocumentRepository;
import com.tanujmethi.raghelpdesk.service.S3StorageService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class RabbitMqConsumer {

    private final CompanyDocumentRepository companyDocumentRepository;
    private final S3StorageService s3StorageService;
    private final RabbitMqPublisher rabbitMqPublisher;

    public RabbitMqConsumer(CompanyDocumentRepository companyDocumentRepository, S3StorageService s3StorageService, RabbitMqPublisher rabbitMqPublisher) {
        this.companyDocumentRepository = companyDocumentRepository;
        this.s3StorageService = s3StorageService;
        this.rabbitMqPublisher = rabbitMqPublisher;
    }

    @RabbitListener(queues = "document.verification.result.queue")
    public void consume(DocumentVerificationResultDto documentVerificationResultDto){
        CompanyDocument document = companyDocumentRepository.findById(documentVerificationResultDto.getDocumentId()).orElseThrow(
                () -> new AppException("Company Document Not Found")
        );

        Long companyId = document.getCompany().getId();
        if (!companyId.equals(documentVerificationResultDto.getCompanyId())) {
            throw new AppException("Verification result company does not match document");
        }

        DocumentStatus status = documentVerificationResultDto.isApproved()
                ? DocumentStatus.APPROVED : DocumentStatus.REJECTED;
        String reason = documentVerificationResultDto.isApproved()
                ? null : documentVerificationResultDto.getReason();
        int updated = companyDocumentRepository.updateVerificationResultIfNotDeleted(
                document.getId(), companyId, status, reason, DocumentStatus.DELETED);
        if (updated == 0) {
            return;
        }

        if (!documentVerificationResultDto.isApproved()) {
            s3StorageService.delete(document.getS3Key());
            rabbitMqPublisher.publishDeleteVector(
                    VectorDocumentDeleteEvent.builder()
                            .documentId(document.getId())
                            .companyId(companyId)
                            .build()
            );
        }
    }
}
