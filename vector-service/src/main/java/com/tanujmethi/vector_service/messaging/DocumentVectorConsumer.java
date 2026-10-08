package com.tanujmethi.vector_service.messaging;

import com.tanujmethi.vector_service.dto.DocumentChunk;
import com.tanujmethi.vector_service.dto.DocumentDeleteRequest;
import com.tanujmethi.vector_service.dto.DocumentVectorRequest;
import com.tanujmethi.vector_service.service.EmbeddingService;
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

    public DocumentVectorConsumer(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @RabbitListener(queues = "document.vector.queue")
    public void consume(DocumentVectorRequest documentVectorRequest) {
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
        System.out.println("Documents added to vector store successfully");
    }

    @RabbitListener(queues = "document.vector.delete.queue")
    public void deleteConsume(DocumentDeleteRequest documentDeleteRequest){
        Filter.Expression filter = new Filter.Expression(
                Filter.ExpressionType.EQ,
                new Filter.Key("documentId"),
                new Filter.Value(documentDeleteRequest.getDocumentId())
        );

        vectorStore.delete(filter);

        log.info("Document deleted" + documentDeleteRequest.getDocumentId());
    }
}
