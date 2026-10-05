package com.tanujmethi.ticketChatService.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponseDto {
    private Long id;
    private Long ticketId;
    private Long senderId;
    private String senderName;
    private String content;
    private LocalDateTime createdAt;
}
