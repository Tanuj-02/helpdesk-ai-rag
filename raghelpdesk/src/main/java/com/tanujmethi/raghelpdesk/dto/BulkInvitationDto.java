package com.tanujmethi.raghelpdesk.dto;

import com.opencsv.bean.CsvBindByName;
import com.tanujmethi.raghelpdesk.enums.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkInvitationDto {
    @CsvBindByName(column = "email", required = true)
    private String email;
    @CsvBindByName(column = "role", required = true)
    private Role role;
}
