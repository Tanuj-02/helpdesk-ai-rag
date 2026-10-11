package com.tanujmethi.raghelpdesk.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKeyRequest {
    @NotBlank(message = "API key is required")
    private String apiKey;
}
