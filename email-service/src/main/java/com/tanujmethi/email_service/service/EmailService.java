package com.tanujmethi.email_service.service;

import com.tanujmethi.email_service.dto.EmailRequest;
import com.tanujmethi.email_service.dto.UrgentEmailRequest;
import com.tanujmethi.email_service.enums.TicketPriority;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    public void sendEmail(EmailRequest emailRequest) {
        String companyName = safe(emailRequest.getCompanyName(), "your team");
        String adminName = safe(emailRequest.getAdminName(), "A teammate");
        String registerUrl = frontendBaseUrl + "/register?token="
                + URLEncoder.encode(safe(emailRequest.getToken(), ""), StandardCharsets.UTF_8);
        String subject = "You're invited to join " + companyName + " on HelpDesk AI";

        String body = INVITE_TEMPLATE
                .replace("{{companyName}}", HtmlUtils.htmlEscape(companyName))
                .replace("{{adminName}}", HtmlUtils.htmlEscape(adminName))
                .replace("{{registerUrl}}", registerUrl)
                .replace("{{registerUrlAttr}}", HtmlUtils.htmlEscape(registerUrl));

        sendHtml(emailRequest.getReceiverEmail(), subject, body);
    }

    public void sendUrgentEmail(UrgentEmailRequest urgentEmailRequest) {
        TicketPriority priority = urgentEmailRequest.getTicketPriority();
        String priorityLabel = priority != null ? priority.name() : "URGENT";
        String priorityColor = priorityColor(priority);
        String subject = "URGENT: " + safe(urgentEmailRequest.getSubject(), "Ticket needs attention")
                + " (" + priorityLabel + ")";

        String body = URGENT_TEMPLATE
                .replace("{{subject}}", HtmlUtils.htmlEscape(safe(urgentEmailRequest.getSubject(), "Untitled ticket")))
                .replace("{{priorityLabel}}", HtmlUtils.htmlEscape(priorityLabel))
                .replace("{{priorityColor}}", priorityColor)
                .replace("{{conversationId}}", HtmlUtils.htmlEscape(
                        urgentEmailRequest.getConversationId() != null
                                ? String.valueOf(urgentEmailRequest.getConversationId())
                                : "N/A"))
                .replace("{{aiSummary}}", HtmlUtils.htmlEscape(
                        safe(urgentEmailRequest.getAiSummary(), "No summary available.")));

        sendHtml(urgentEmailRequest.getAgentEmail(), subject, body);
    }

    private void sendHtml(String to, String subject, String html) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Recipient email is required");
        }
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            if (fromAddress != null && !fromAddress.isBlank()) {
                helper.setFrom(fromAddress, "HelpDesk AI");
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);

            javaMailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new IllegalStateException("Failed to send email to " + to, e);
        }
    }

    private static String priorityColor(TicketPriority priority) {
        if (priority == null) {
            return "#6b7280";
        }
        return switch (priority) {
            case URGENT -> "#dc2626";
            case HIGH -> "#ea580c";
            case MEDIUM -> "#ca8a04";
            case LOW -> "#16a34a";
        };
    }

    private static String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static final String INVITE_TEMPLATE = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invitation</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background-color:#4f46e5;padding:26px 32px;">
                          <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.2px;">HelpDesk AI</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px;">
                          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#18181b;">You're invited to join {{companyName}}</h1>
                          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
                            Hi there,<br>
                            <strong>{{adminName}}</strong> has invited you to collaborate on
                            <strong>{{companyName}}</strong> using HelpDesk AI &mdash; your AI-powered support workspace.
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                            <tr>
                              <td style="border-radius:8px;background-color:#4f46e5;">
                                <a href="{{registerUrlAttr}}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Accept invitation</a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 6px;font-size:12px;color:#71717a;">Or paste this link into your browser:</p>
                          <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;">
                            <a href="{{registerUrlAttr}}" style="color:#4f46e5;">{{registerUrl}}</a>
                          </p>
                          <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">
                            This invitation expires in 24 hours. If you weren't expecting it, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
                          <p style="margin:0;font-size:12px;color:#a1a1aa;">HelpDesk AI &middot; Automated message, please do not reply.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

    private static final String URGENT_TEMPLATE = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Urgent ticket</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background-color:#dc2626;padding:26px 32px;">
                          <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.2px;">HelpDesk AI</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px;">
                          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:{{priorityColor}};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;">{{priorityLabel}}</span>
                          <h1 style="margin:16px 0 12px;font-size:20px;line-height:1.3;color:#18181b;">{{subject}}</h1>
                          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
                            A ticket has been assigned to you and requires immediate attention.
                          </p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                            <tr>
                              <td style="padding:16px 18px;">
                                <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.5px;color:#71717a;">CONVERSATION ID</p>
                                <p style="margin:0;font-size:14px;color:#18181b;">{{conversationId}}</p>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.5px;color:#71717a;">AI SUMMARY</p>
                          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">{{aiSummary}}</p>
                          <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">
                            Please log in to HelpDesk AI to review and respond.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
                          <p style="margin:0;font-size:12px;color:#a1a1aa;">HelpDesk AI &middot; Automated message, please do not reply.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
}