package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTicketRequest {
    @NotBlank(message = "Subject is required")
    private String subject;
    private String aiSummary;
    private Long conversationId;
    private String description;
    private String category;
    private TicketPriority ticketPriority;
}
