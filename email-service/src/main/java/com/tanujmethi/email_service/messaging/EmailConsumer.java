package com.tanujmethi.email_service.messaging;

import com.tanujmethi.email_service.dto.EmailRequest;
import com.tanujmethi.email_service.service.EmailService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class EmailConsumer {

    private final EmailService emailService;

    public EmailConsumer(EmailService emailService) {
        this.emailService = emailService;
    }

    @RabbitListener(queues = "document.email.queue")
    public void consumer(EmailRequest emailRequest){
        emailService.sendEmail(emailRequest);
    }
}
