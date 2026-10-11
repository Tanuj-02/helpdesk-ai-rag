package com.tanujmethi.raghelpdesk.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequest {
    @NotNull(message = "Ticket id is required")
    private Long ticketId;
    @NotNull(message = "User id is required")
    private Long userId;
    private Long agentId;
    @NotNull(message = "Company id is required")
    private Long companyId;
}
