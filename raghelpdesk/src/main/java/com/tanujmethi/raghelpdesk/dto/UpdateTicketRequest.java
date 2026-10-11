package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTicketRequest {
    private TicketStatus ticketStatus;
    private TicketPriority ticketPriority;
    @Size(min = 3, message = "Subject must be at least 3 characters")
    private String subject;
    @Size(max = 2000, message = "AI summary cannot exceed 2000 characters")
    private String aiSummary;
}