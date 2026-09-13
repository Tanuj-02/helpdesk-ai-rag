package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Invitationdto {
    private String email;
    private Role role;
    private User invitedBy;
}
