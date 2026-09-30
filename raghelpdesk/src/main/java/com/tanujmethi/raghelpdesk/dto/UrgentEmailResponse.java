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
    private Long userId;
    private String subject;
    private String conversationId;
    @Lob
    private String aiSummary;
    private TicketPriority ticketPriority;
}
