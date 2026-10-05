package com.tanujmethi.raghelpdesk.messaging;

import com.tanujmethi.raghelpdesk.config.RabbitMQConfig;
import com.tanujmethi.raghelpdesk.dto.ChatRequest;
import com.tanujmethi.raghelpdesk.dto.DocumentUploadEvent;

import com.tanujmethi.raghelpdesk.dto.EmailResponse;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class RabbitMqPublisher {

    private final RabbitTemplate rabbitTemplate;

    public RabbitMqPublisher(RabbitTemplate rabbitTemplate) {
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
        rabbitTemplate.convertAndSend(RabbitMQConfig.EMAIL_EXCHANGE, RabbitMQConfig.DOCUMENT_EMAIL_ROUTING_KEY, emailResponse);
    }

    public void publishChat(ChatRequest chatRequest){
        rabbitTemplate.convertAndSend(RabbitMQConfig.CHAT_EXCHANGE, RabbitMQConfig.CHAT_ROUTING_KEY, chatRequest);
    }
}