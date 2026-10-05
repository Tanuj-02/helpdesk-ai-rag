package com.tanujmethi.ticketChatService.service;

import com.tanujmethi.ticketChatService.dto.ChatMessageDto;
import com.tanujmethi.ticketChatService.dto.ChatResponseDto;
import com.tanujmethi.ticketChatService.entity.Chat;
import com.tanujmethi.ticketChatService.entity.ChatMessage;
import com.tanujmethi.ticketChatService.repository.ChatMessageRepository;
import com.tanujmethi.ticketChatService.repository.ChatRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRepository chatRepository;

    public ChatService(ChatMessageRepository chatMessageRepository, ChatRepository chatRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatRepository = chatRepository;
    }

    public ChatResponseDto saveMessage(ChatMessageDto request, Long userId) {

        Chat chat = chatRepository
                .findByTicketId(request.getTicketId())
                .orElseThrow(() ->
                        new RuntimeException("Chat not found"));

        if (!chat.getUserId().equals(userId)
                && !chat.getAgentId().equals(userId)) {

            throw new AccessDeniedException(
                    "You are not part of this ticket"
            );
        }

        ChatMessage message = ChatMessage.builder()
                .ticketId(request.getTicketId())
                .senderId(userId)
                .content(request.getContent())
                .createdAt(LocalDateTime.now())
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        return ChatResponseDto.builder()
                .ticketId(saved.getTicketId())
                .id(saved.getId())
                .senderId(saved.getSenderId())
                .content(saved.getContent())
                .createdAt(saved.getCreatedAt())
                .senderName(saved.getSenderName())
                .build();
    }

    public List<ChatResponseDto> getMessages(Long ticketId){
        List<ChatMessage> messages = chatMessageRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);

        return messages.stream()
                .map(message -> ChatResponseDto.builder()
                        .id(message.getId())
                        .content(message.getContent())
                        .ticketId(message.getTicketId())
                        .senderId(message.getSenderId())
                        .senderName(message.getSenderName())
                        .createdAt(message.getCreatedAt())
                        .build()
                )
                .toList();
    }
}
