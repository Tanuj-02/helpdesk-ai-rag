package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiConfigResponse {
    private boolean configured;
    private String apiKey;
    private LocalDateTime updatedAt;
}
