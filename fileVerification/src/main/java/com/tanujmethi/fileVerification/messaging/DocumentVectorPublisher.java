package com.tanujmethi.fileVerification.messaging;

import com.tanujmethi.fileVerification.config.RabbitMQConfig;
import com.tanujmethi.fileVerification.dto.DocumentVectorResponse;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class DocumentVectorPublisher {

    private final RabbitTemplate rabbitTemplate;

    public DocumentVectorPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(DocumentVectorResponse documentVectorResponse){
        rabbitTemplate.convertAndSend(RabbitMQConfig.DOCUMENT_VERIFICATION_RESULT_EXCHANGE, RabbitMQConfig.DOCUMENT_VECTOR_ROUTING_KEY, documentVectorResponse);
    }
}
