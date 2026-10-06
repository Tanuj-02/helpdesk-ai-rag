package com.tanujmethi.email_service.dto;

import com.tanujmethi.email_service.enums.TicketPriority;
import lombok.*;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class UrgentEmailRequest {
    private String agentEmail;
    private String subject;
    private Long conversationId;
    private String aiSummary;
    private TicketPriority ticketPriority;
}
