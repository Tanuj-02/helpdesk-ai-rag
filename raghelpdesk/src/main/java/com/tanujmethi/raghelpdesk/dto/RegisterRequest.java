package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    private String companyName;
    private String companyEmail;
    private String adminName;
    private String adminEmail;
    private String password;
}
