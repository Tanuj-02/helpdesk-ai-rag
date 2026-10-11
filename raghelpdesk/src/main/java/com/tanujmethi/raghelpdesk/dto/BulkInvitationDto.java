package com.tanujmethi.raghelpdesk.dto;

import com.opencsv.bean.CsvBindByName;
import com.tanujmethi.raghelpdesk.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkInvitationDto {
    @CsvBindByName(column = "email", required = true)
    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    private String email;
    @CsvBindByName(column = "role", required = true)
    @NotNull(message = "Role is required")
    private Role role;
}
