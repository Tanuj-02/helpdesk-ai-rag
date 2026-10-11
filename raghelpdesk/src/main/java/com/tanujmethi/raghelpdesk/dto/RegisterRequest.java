package com.tanujmethi.raghelpdesk.dto;

import lombok.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    @NotBlank(message = "Company name is required")
    private String companyName;
    @NotBlank(message = "Company email is required")
    @Email(message = "Company email is invalid")
    private String companyEmail;
    @NotBlank(message = "Admin name is required")
    private String adminName;
    @NotBlank(message = "Admin email is required")
    @Email(message = "Admin email is invalid")
    private String adminEmail;
    @NotBlank(message = "Password is required")
    private String password;
}
