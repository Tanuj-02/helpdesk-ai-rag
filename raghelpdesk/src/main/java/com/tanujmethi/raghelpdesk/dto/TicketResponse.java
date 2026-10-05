package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import jakarta.persistence.Lob;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketResponse {
    private Long id;
    private Long userId;
    private Long agentId;
    private Long companyId;
    private TicketStatus ticketStatus;
    private TicketPriority ticketPriority;
    private String category;
    private String subject;
    @Lob
    private String aiSummary;
    @Lob
    private String description;
    private LocalDateTime createdAt;
    private Long conversationId;

}
