package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import jakarta.persistence.Lob;
import lombok.*;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class UrgentEmailResponse {
    private String agentEmail;
    private String subject;
    private Long conversationId;
    @Lob
    private String aiSummary;
    private TicketPriority ticketPriority;
}
