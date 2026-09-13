package com.tanujmethi.raghelpdesk.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailResponse {
    private String token;
    private String companyName;
    private String adminName;
    private String receiverEmail;
}
