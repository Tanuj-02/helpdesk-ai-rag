package com.tanujmethi.fileVerification.messaging;

import com.tanujmethi.fileVerification.dto.*;
import com.tanujmethi.fileVerification.service.DocumentChunkingService;
import com.tanujmethi.fileVerification.service.DocumentSamplingService;
import com.tanujmethi.fileVerification.service.DocumentVerificationService;
import com.tanujmethi.fileVerification.service.S3FileStorageService;
import com.tanujmethi.fileVerification.service.TextExtractionService;
import com.tanujmethi.fileVerification.service.VerificationResultAggregator;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DocumentVerificationConsumer {

    private final S3FileStorageService s3FileStorageService;
    private final TextExtractionService textExtractionService;
    private final DocumentChunkingService documentChunkingService;
    private final DocumentVerificationService documentVerificationService;
    private final DocumentSamplingService documentSamplingService;
    private final VerificationResultAggregator verificationResultAggregator;
    private final DocumentVerificationResultProducer documentVerificationResultProducer;
    private final DocumentVectorPublisher documentVectorPublisher;

    public DocumentVerificationConsumer(
            S3FileStorageService s3FileStorageService,
            TextExtractionService textExtractionService,
            DocumentChunkingService documentChunkingService,
            DocumentVerificationService documentVerificationService,
            DocumentSamplingService documentSamplingService,
            VerificationResultAggregator verificationResultAggregator, DocumentVerificationResultProducer documentVerificationResultProducer, DocumentVectorPublisher documentVectorPublisher
    ) {
        this.s3FileStorageService = s3FileStorageService;
        this.textExtractionService = textExtractionService;
        this.documentChunkingService = documentChunkingService;
        this.documentVerificationService = documentVerificationService;
        this.documentSamplingService = documentSamplingService;
        this.verificationResultAggregator = verificationResultAggregator;
        this.documentVerificationResultProducer = documentVerificationResultProducer;
        this.documentVectorPublisher = documentVectorPublisher;
    }

    @RabbitListener(queues = "document.verification.queue")
    public void consume(DocumentVerificationRequest request) {

        try {
            try (var inputStream = s3FileStorageService.download(
                    "ai-helpdesk-tanuj",
                    request.getS3Key()
            )) {

                String text = textExtractionService.extractText(
                        inputStream,
                        request.getS3Key()
                );

                List<DocumentChunk> chunks =
                        documentChunkingService.chunkText(text);

                if (chunks.isEmpty()) {
                    throw new IllegalStateException(
                            "No text could be extracted from document"
                    );
                }

                List<DocumentChunk> sampledChunks =
                        documentSamplingService.sampleChunks(
                                chunks,
                                5
                        );

                List<DocumentVerificationResult> results =
                        new ArrayList<>();

                for (DocumentChunk chunk : sampledChunks) {

                    DocumentVerificationResult result =
                            documentVerificationService.verify(
                                    chunk.getContent(),
                                    request.getDocumentType()
                            );

                    results.add(result);
                }

                DocumentVerificationResult finalResult =
                        verificationResultAggregator.aggregate(
                                results
                        );

                boolean approved = finalResult.isAppropriate()
                        && finalResult.isRelevant()
                        && finalResult.isHelpdeskKnowledge()
                        && finalResult.getConfidence() >= 0.70;

                if(approved){
                    DocumentVectorResponse documentVectorResponse = DocumentVectorResponse.builder()
                            .requestId(request.getRequestId())
                            .documentId(request.getDocumentId())
                            .companyId(request.getCompanyId())
                            .documentType(request.getDocumentType())
                            .contentType(request.getContentType())
                            .documentChunks(chunks)
                            .build();

                    documentVectorPublisher.publish(documentVectorResponse);
                }

                FinalResultToHelpDesk finalResultToHelpDesk = FinalResultToHelpDesk.builder()
                        .requestId(request.getRequestId())
                        .documentId(request.getDocumentId())
                        .companyId(request.getCompanyId())
                        .approved(approved)
                        .confidence(finalResult.getConfidence())
                        .reason(finalResult.getReason())
                        .build();

                documentVerificationResultProducer.publish(finalResultToHelpDesk);
            }

        } catch (Exception e) {

            System.err.println(
                    "Failed to process document: "
                            + request.getDocumentId()
            );

            e.printStackTrace();

            throw new RuntimeException(
                    "Failed to process document: "
                            + request.getDocumentId(),
                    e
            );
        }
    }
}