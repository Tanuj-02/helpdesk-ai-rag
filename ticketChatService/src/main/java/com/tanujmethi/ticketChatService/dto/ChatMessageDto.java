package com.tanujmethi.ticketChatService.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    @NotNull
    @Positive
    private Long ticketId;
    private String senderName;
    @NotBlank(message = "message can't be blank")
    @Size(max = 2000, message = "message cannot exceed 2000 characters")
    private String content;
}
