package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.Role;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CurrentUserResponse {
    private Long id;
    private String name;
    private Long companyId;
    private String email;
    private String companyName;
    private Role role;
}
