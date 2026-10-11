package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.ConversationResponse;
import com.tanujmethi.raghelpdesk.dto.MessageResponse;
import com.tanujmethi.raghelpdesk.service.ConversationService;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/conversation")
public class ConversationController {
    private final ConversationService conversationService;
    private final CurrentUserService currentUserService;

    public ConversationController(ConversationService conversationService, CurrentUserService currentUserService) {
        this.conversationService = conversationService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(){
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(conversationService.createConversation());
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<Page<MessageResponse>> getMessages(@PathVariable Long conversationId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(conversationService.getMessages(conversationId, pageable));
    }

    @GetMapping
    public ResponseEntity<Page<ConversationResponse>> getMyConversations(@PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(conversationService.getMyConversations(pageable));
    }

    @PatchMapping("/{conversationId}/title")
    public ResponseEntity<Void> updateTitle(@PathVariable Long conversationId, @RequestParam String title) {
        conversationService.updateTitle(conversationId, title, currentUserService.getUserId());
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PatchMapping("/{conversationId}/model/{model}")
    public ResponseEntity<Void> updateModel(@PathVariable Long conversationId, @PathVariable String model) {
        conversationService.updateModel(conversationId, model);
        return ResponseEntity.noContent().build();
    }
}
