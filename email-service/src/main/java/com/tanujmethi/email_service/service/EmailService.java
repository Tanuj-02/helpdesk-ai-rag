package com.tanujmethi.email_service.service;

import com.tanujmethi.email_service.dto.EmailRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;

    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }


    public void sendEmail(EmailRequest emailRequest) {
        String body = """
                aasdfasdf
                """;

        String subject = """
        Invitation to Join %s on HelpDesk AI
        """.formatted(emailRequest.getCompanyName());

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(emailRequest.getReceiverEmail());
        message.setText(body);
        message.setSubject(subject);

        javaMailSender.send(message);
    }
}
