package com.tanujmethi.email_service.messaging;

import com.tanujmethi.email_service.dto.UrgentEmailRequest;
import com.tanujmethi.email_service.service.EmailService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class UrgentEmailConsumer {
    private final EmailService emailService;

    public UrgentEmailConsumer(EmailService emailService) {
        this.emailService = emailService;
    }

    @RabbitListener(queues = "urgent.email.queue")
    public void sendUrgentEmail(UrgentEmailRequest urgentEmailRequest){
        emailService.sendUrgentEmail(urgentEmailRequest);
    }
}
