package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import lombok.*;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvitationDto {
    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    private String email;
    @NotNull(message = "Role is required")
    private Role role;
    private User invitedBy;
}
