package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRegistration {
    private String token;
    private String name;
    private String password;
}
