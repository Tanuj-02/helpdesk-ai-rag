package com.tanujmethi.vector_service.messaging;

import com.tanujmethi.vector_service.dto.DocumentChunk;
import com.tanujmethi.vector_service.dto.DocumentDeleteRequest;
import com.tanujmethi.vector_service.dto.DocumentVectorRequest;
import com.tanujmethi.vector_service.repository.DocumentStateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class DocumentVectorConsumer {

    private final VectorStore vectorStore;
    private final DocumentStateRepository documentStates;

    public DocumentVectorConsumer(VectorStore vectorStore, DocumentStateRepository documentStates) {
        this.vectorStore = vectorStore;
        this.documentStates = documentStates;
    }

    @RabbitListener(queues = "document.vector.queue")
    public void consume(DocumentVectorRequest documentVectorRequest) {
        requireIds(documentVectorRequest.getCompanyId(), documentVectorRequest.getDocumentId());
        if (!isIndexable(documentVectorRequest.getCompanyId(), documentVectorRequest.getDocumentId())) {
            log.info("Skipping chunks for inactive document {}", documentVectorRequest.getDocumentId());
            return;
        }

        List<Document> documents = new ArrayList<>();
        for (DocumentChunk documentChunk : documentVectorRequest.getDocumentChunks()) {

            Document document = new Document(
                    documentChunk.getContent(), Map.of(
                    "requestId", documentVectorRequest.getRequestId(),
                    "documentId", documentVectorRequest.getDocumentId(),
                    "companyId", documentVectorRequest.getCompanyId(),
                    "documentType", documentVectorRequest.getDocumentType(),
                    "contentType", documentVectorRequest.getContentType(),
                    "chunkNumber", documentChunk.getChunkNumber()
            )
            );

            documents.add(document);
        }

        vectorStore.add(documents);
        // Deletion can commit while embeddings are being generated. Purge the
        // newly added chunks if the document changed state during that call.
        if (!isIndexable(documentVectorRequest.getCompanyId(), documentVectorRequest.getDocumentId())) {
            deleteVectors(documentVectorRequest.getCompanyId(), documentVectorRequest.getDocumentId());
        }
    }

    @RabbitListener(queues = "document.vector.delete.queue")
    public void deleteConsume(DocumentDeleteRequest documentDeleteRequest){
        requireIds(documentDeleteRequest.getCompanyId(), documentDeleteRequest.getDocumentId());
        deleteVectors(documentDeleteRequest.getCompanyId(), documentDeleteRequest.getDocumentId());
    }

    private boolean isIndexable(Long companyId, Long documentId) {
        String status = documentStates.statusOf(companyId, documentId)
                .orElseThrow(() -> new IllegalStateException("Document state not yet available: " + documentId));
        return switch (status) {
            case "UPLOADED", "PROCESSING", "APPROVED" -> true;
            case "REJECTED", "FAILED", "DELETED" -> false;
            default -> throw new IllegalStateException("Unknown document status: " + status);
        };
    }

    private void deleteVectors(Long companyId, Long documentId) {
        Filter.Expression filter = new Filter.Expression(Filter.ExpressionType.AND,
                new Filter.Expression(Filter.ExpressionType.EQ,
                        new Filter.Key("companyId"), new Filter.Value(companyId)),
                new Filter.Expression(Filter.ExpressionType.EQ,
                        new Filter.Key("documentId"), new Filter.Value(documentId)));
        vectorStore.delete(filter);
        log.info("Purged vectors for company {} document {}", companyId, documentId);
    }

    private void requireIds(Long companyId, Long documentId) {
        if (companyId == null || companyId <= 0 || documentId == null || documentId <= 0) {
            throw new IllegalArgumentException("Company and document IDs are required");
        }
    }
}
