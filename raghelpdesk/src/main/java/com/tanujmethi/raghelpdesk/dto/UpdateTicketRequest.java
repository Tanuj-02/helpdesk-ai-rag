package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTicketRequest {
    private TicketStatus ticketStatus;
    private TicketPriority ticketPriority;
    private String subject;
    private String aiSummary;
}