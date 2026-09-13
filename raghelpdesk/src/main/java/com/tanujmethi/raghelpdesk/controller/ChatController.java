package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.service.ChatService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/ai")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/chat")
    public Flux<String> chat(@RequestParam String query, @RequestParam Long chatId, Authentication authentication){
        return chatService.chat(query, chatId, authentication);
    }
}
