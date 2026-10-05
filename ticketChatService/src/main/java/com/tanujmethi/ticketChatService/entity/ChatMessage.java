package com.tanujmethi.ticketChatService.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long ticketId;
    private Long senderId;
    private String senderName;
    @Column(columnDefinition = "TEXT")
    private String content;
    private LocalDateTime createdAt;
}
