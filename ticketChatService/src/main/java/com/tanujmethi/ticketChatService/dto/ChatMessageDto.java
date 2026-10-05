package com.tanujmethi.ticketChatService.dto;

import jakarta.persistence.Lob;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private Long ticketId;
    private String senderName;
    @Lob
    private String content;
}
