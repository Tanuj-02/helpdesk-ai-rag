package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.Role;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Role role;
    private Long userId;
    private Long companyId;
    private String name;
    private String email;
}
