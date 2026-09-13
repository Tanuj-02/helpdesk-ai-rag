package com.tanujmethi.raghelpdesk.messaging;

import com.tanujmethi.raghelpdesk.dto.DocumentVerificationResultDto;
import com.tanujmethi.raghelpdesk.entity.CompanyDocument;
import com.tanujmethi.raghelpdesk.enums.DocumentStatus;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyDocumentRepository;
import com.tanujmethi.raghelpdesk.service.S3StorageService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class DocumentVerificationResultConsumer {

    private final CompanyDocumentRepository companyDocumentRepository;
    private final S3StorageService s3StorageService;

    public DocumentVerificationResultConsumer(CompanyDocumentRepository companyDocumentRepository, S3StorageService s3StorageService) {
        this.companyDocumentRepository = companyDocumentRepository;
        this.s3StorageService = s3StorageService;
    }

    @RabbitListener(queues = "document.verification.result.queue")
    public void consume(DocumentVerificationResultDto documentVerificationResultDto){
        CompanyDocument document = companyDocumentRepository.findById(documentVerificationResultDto.getDocumentId()).orElseThrow(
                () -> new AppException("Company Document Not Found")
        );

        if(documentVerificationResultDto.isApproved()){
            document.setStatus(DocumentStatus.APPROVED);
        } else{

            document.setStatus(DocumentStatus.REJECTED);
            s3StorageService.delete(document.getS3Key());
            document.setRejectionReason(documentVerificationResultDto.getReason());
        }
        companyDocumentRepository.save(document);
    }
}
