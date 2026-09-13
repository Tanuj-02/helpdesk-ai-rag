package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.Status;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private Status status;
}
