package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.entity.Conversation;
import com.tanujmethi.raghelpdesk.enums.MessageRole;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import com.tanujmethi.raghelpdesk.tools.TicketTool;
import io.jsonwebtoken.Jwt;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.concurrent.CompletableFuture;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final CurrentUserService currentUserService;
    private final TicketTool ticketTool;
    private final ConversationService conversationService;

    public ChatService(ChatClient chatClient, VectorStore vectorStore, CurrentUserService currentUserService, TicketTool ticketTool, ConversationService conversationService) {
        this.chatClient = chatClient;
        this.vectorStore = vectorStore;
        this.currentUserService = currentUserService;
        this.ticketTool = ticketTool;
        this.conversationService = conversationService;
    }

    public Flux<String> chat(String query, Long chatId) {

        Long companyId = currentUserService.getCompanyId();
        Long userId = currentUserService.getUserId();

        Conversation conversation =
                conversationService.getConversation(chatId);

        conversationService.saveMessage(chatId, MessageRole.USER, query);

        if (conversation.getTitle() == null) {

            CompletableFuture.runAsync(() -> {

                String title = generateTitle(query);

                conversationService.updateTitle(
                        chatId,
                        title
                );
            });
        }

        QuestionAnswerAdvisor questionAnswerAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
                .searchRequest(SearchRequest.builder()
                        .topK(10)
                        .similarityThreshold(0.4)
                        .filterExpression("companyId == '" + companyId + "'")
                        .build())
                .build();

        StringBuilder aiResponse = new StringBuilder();

        return chatClient
                .prompt()
                .user(query)
                .advisors(questionAnswerAdvisor)
                .tools(ticketTool)
                .toolContext(Map.of(
                        "userId", userId,
                        "companyId", companyId,
                        "role", currentUserService.getRole()
                ))
                .advisors(a -> a.param(
                        ChatMemory.CONVERSATION_ID,
                        chatId
                ))
                .stream()
                .content()
                .doOnNext(aiResponse::append)
                .doOnComplete(() -> {
                    conversationService.saveMessage(
                            chatId,
                            MessageRole.ASSISTANT,
                            aiResponse.toString()
                    );
                });
    }

    private String generateTitle(String query) {

        return chatClient
                .prompt("""
                    Generate a short title for this support conversation.
                    Rules:
                    - Maximum 6 words
                    - No quotation marks
                    - Do not use "Chat" or "Conversation"
                    - Describe the user's main issue

                    User message:
                    %s
                    """.formatted(query))
                .call()
                .content();
    }
}
