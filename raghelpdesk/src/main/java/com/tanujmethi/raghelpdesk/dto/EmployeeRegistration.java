package com.tanujmethi.raghelpdesk.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRegistration {
    @NotBlank(message = "Invitation token is required")
    private String token;
    @NotBlank(message = "Name is required")
    private String name;
    @NotBlank(message = "Password is required")
    private String password;
}
