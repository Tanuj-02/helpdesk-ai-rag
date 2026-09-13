package com.tanujmethi.email_service.dto;


import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailRequest {
    private String companyName;
    private String receiverEmail;
    private String adminName;
    private String token;

}
