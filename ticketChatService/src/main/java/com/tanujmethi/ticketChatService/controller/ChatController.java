package com.tanujmethi.ticketChatService.controller;

import com.tanujmethi.ticketChatService.dto.ChatMessageDto;
import com.tanujmethi.ticketChatService.dto.ChatResponseDto;
import com.tanujmethi.ticketChatService.dto.ChatUserDetails;
import com.tanujmethi.ticketChatService.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
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
    public ResponseEntity<Void> sendMessage(@Valid ChatMessageDto request, Principal principal) {

        ChatUserDetails user = (ChatUserDetails) ((Authentication) principal).getPrincipal();

        ChatResponseDto message = chatService.saveMessage(request, user);

        messagingTemplate.convertAndSend("/topic/ticket/" + request.getTicketId(), message);

        return ResponseEntity.ok().build();
    }
}
