package com.tanujmethi.fileVerification.messaging;

import com.tanujmethi.fileVerification.config.RabbitMQConfig;
import com.tanujmethi.fileVerification.dto.FinalResultToHelpDesk;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class DocumentVerificationResultProducer {

    private final RabbitTemplate rabbitTemplate;

    public DocumentVerificationResultProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(FinalResultToHelpDesk finalResultToHelpDesk){
        rabbitTemplate.convertAndSend(RabbitMQConfig.DOCUMENT_VERIFICATION_RESULT_EXCHANGE, RabbitMQConfig.DOCUMENT_VERIFICATION_RESULT_ROUTING_KEY, finalResultToHelpDesk);
    }
}
