package com.tanujmethi.ticketChatService.dto;

import jakarta.persistence.Lob;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private Long ticketId;
    private String senderName;
    @Lob @NotBlank(message = "message can't be blank")
    private String content;
}
