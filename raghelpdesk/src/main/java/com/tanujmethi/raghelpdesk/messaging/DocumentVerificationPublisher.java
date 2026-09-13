package com.tanujmethi.raghelpdesk.messaging;

import com.tanujmethi.raghelpdesk.config.RabbitMQConfig;
import com.tanujmethi.raghelpdesk.dto.DocumentUploadEvent;

import com.tanujmethi.raghelpdesk.dto.EmailResponse;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class DocumentVerificationPublisher {

    private final RabbitTemplate rabbitTemplate;

    public DocumentVerificationPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(DocumentUploadEvent request) {

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DOCUMENT_VERIFICATION_EXCHANGE,
                RabbitMQConfig.DOCUMENT_VERIFICATION_ROUTING_KEY,
                request
        );
    }

    public void publishEmail(EmailResponse emailResponse){
        rabbitTemplate.convertAndSend(RabbitMQConfig.DOCUMENT_VERIFICATION_EXCHANGE, RabbitMQConfig.DOCUMENT_EMAIL_ROUTING_KEY, emailResponse);
    }
}