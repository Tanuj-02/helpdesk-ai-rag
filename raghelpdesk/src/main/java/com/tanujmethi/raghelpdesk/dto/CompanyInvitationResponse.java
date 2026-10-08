package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyInvitationResponse {

    private Long id;
    private String companyName;
    private Long companyId;
    private String email;
    private String token;
    private LocalDateTime createAt;
    private boolean used;
    private LocalDateTime expiresAt;
    private String invitedByName;
    private Long invitedById;
}
