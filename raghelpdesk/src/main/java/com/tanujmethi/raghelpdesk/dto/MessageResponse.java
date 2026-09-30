package com.tanujmethi.raghelpdesk.dto;

import com.tanujmethi.raghelpdesk.enums.MessageRole;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {
    private Long id;
    private MessageRole role;
    private String content;
    private LocalDateTime createdAt;
}
