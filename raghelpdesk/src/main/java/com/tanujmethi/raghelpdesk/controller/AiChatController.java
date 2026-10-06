package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.service.AiChatService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/ai")
public class AiChatController {

    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @GetMapping("/chat")
    public Flux<String> chat(@RequestParam String query, @RequestParam Long chatId, @RequestParam String model){
        return aiChatService.chat(query, chatId, model);
    }
}
