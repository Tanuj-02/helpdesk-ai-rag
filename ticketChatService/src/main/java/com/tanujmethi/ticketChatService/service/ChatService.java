package com.tanujmethi.ticketChatService.service;

import com.tanujmethi.ticketChatService.dto.ChatMessageDto;
import com.tanujmethi.ticketChatService.dto.ChatResponseDto;
import com.tanujmethi.ticketChatService.dto.ChatUserDetails;
import com.tanujmethi.ticketChatService.entity.Chat;
import com.tanujmethi.ticketChatService.entity.ChatMessage;
import com.tanujmethi.ticketChatService.entity.ChatUser;
import com.tanujmethi.ticketChatService.exception.ChatNotFoundException;
import com.tanujmethi.ticketChatService.exception.UnauthorizedChatAccessException;
import com.tanujmethi.ticketChatService.repository.ChatMessageRepository;
import com.tanujmethi.ticketChatService.repository.ChatRepository;
import com.tanujmethi.ticketChatService.repository.ChatUserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatService {
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRepository chatRepository;
    private final ChatUserRepository chatUserRepository;

    public ChatService(ChatMessageRepository chatMessageRepository, ChatRepository chatRepository,
                       ChatUserRepository chatUserRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatRepository = chatRepository;
        this.chatUserRepository = chatUserRepository;
    }

    public ChatResponseDto saveMessage(ChatMessageDto request, ChatUserDetails user) {
        Chat chat = requireAccess(request.getTicketId(), user);
        ChatUser sender = chatUserRepository.findByIdAndCompanyId(user.userId(), chat.getCompanyId())
                .orElseThrow(() -> new UnauthorizedChatAccessException("Sender is not a current company user"));
        if (sender.getName() == null || sender.getName().isBlank()) {
            throw new UnauthorizedChatAccessException("Sender has no display name");
        }

        ChatMessage message = ChatMessage.builder()
                .ticketId(request.getTicketId())
                .senderId(user.userId())
                .senderName(sender.getName())
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

    public List<ChatResponseDto> getMessages(Long ticketId, ChatUserDetails user){
        Chat chat = requireAccess(ticketId, user);

        List<ChatMessage> messages = chatMessageRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
        List<Long> unresolvedSenderIds = messages.stream()
                .filter(message -> message.getSenderName() == null || message.getSenderName().isBlank())
                .map(ChatMessage::getSenderId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> names = unresolvedSenderIds.isEmpty() ? Map.of() :
                chatUserRepository.findByIdInAndCompanyId(unresolvedSenderIds, chat.getCompanyId()).stream()
                        .filter(sender -> sender.getName() != null && !sender.getName().isBlank())
                        .collect(Collectors.toMap(ChatUser::getId, ChatUser::getName));

        return messages.stream()
                .map(message -> ChatResponseDto.builder()
                        .id(message.getId())
                        .content(message.getContent())
                        .ticketId(message.getTicketId())
                        .senderId(message.getSenderId())
                        .senderName(message.getSenderName() == null || message.getSenderName().isBlank()
                                ? names.get(message.getSenderId()) : message.getSenderName())
                        .createdAt(message.getCreatedAt())
                        .build()
                )
                .toList();
    }

    public Chat requireAccess(Long ticketId, ChatUserDetails user) {
        if (user == null || user.userId() == null || user.companyId() == null) {
            throw new UnauthorizedChatAccessException("Authentication is required for this ticket");
        }

        Chat chat = chatRepository
                .findByTicketId(ticketId)
                .orElseThrow(() -> new ChatNotFoundException("Chat with " + ticketId + " not found"));

        boolean sameCompany = Objects.equals(chat.getCompanyId(), user.companyId());
        boolean participant = Objects.equals(chat.getUserId(), user.userId())
                || Objects.equals(chat.getAgentId(), user.userId());

        if (!sameCompany || !participant) {
            throw new UnauthorizedChatAccessException("You are not part of this ticket");
        }
        return chat;
    }
}
