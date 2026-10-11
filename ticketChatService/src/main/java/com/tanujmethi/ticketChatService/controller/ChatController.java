package com.tanujmethi.ticketChatService.controller;

import com.tanujmethi.ticketChatService.dto.ChatMessageDto;
import com.tanujmethi.ticketChatService.dto.ChatResponseDto;
import com.tanujmethi.ticketChatService.dto.ChatUserDetails;
import com.tanujmethi.ticketChatService.entity.ChatMessage;
import com.tanujmethi.ticketChatService.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/ticket/chat")
    public ResponseEntity<Void> sendMessage(ChatMessageDto request, Principal principal) {

        ChatUserDetails user = (ChatUserDetails) ((Authentication) principal).getPrincipal();

        Long userId = user.userId();

        ChatResponseDto message = chatService.saveMessage(request, userId);

        messagingTemplate.convertAndSend("/topic/ticket/" + request.getTicketId(), message);

        return ResponseEntity.ok().build();
    }
}
