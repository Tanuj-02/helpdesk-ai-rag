package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequest {
    private Long ticketId;
    private Long userId;
    private Long agentId;
    private Long companyId;
}
