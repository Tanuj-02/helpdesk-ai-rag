package com.tanujmethi.ticketChatService.controller;

import com.tanujmethi.ticketChatService.dto.ChatResponseDto;
import com.tanujmethi.ticketChatService.dto.ChatUserDetails;
import com.tanujmethi.ticketChatService.service.ChatService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class ChatHistoryController {

    private final ChatService chatService;

    public ChatHistoryController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/{ticketId}/messages")
    public List<ChatResponseDto> getMessages(@PathVariable Long ticketId, Principal principal) {
        ChatUserDetails user = (ChatUserDetails) ((Authentication) principal).getPrincipal();

        Long userId = user.userId();
        return chatService.getMessages(ticketId, userId);
    }
}
