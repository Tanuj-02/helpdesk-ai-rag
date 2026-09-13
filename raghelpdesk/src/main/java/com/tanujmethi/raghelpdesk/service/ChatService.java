package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
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
import java.util.Vector;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final AuthService authService;

    public ChatService(ChatClient chatClient, VectorStore vectorStore, AuthService authService) {
        this.chatClient = chatClient;
        this.vectorStore = vectorStore;
        this.authService = authService;
    }

    public Flux<String> chat(String query, Long chatId, Authentication authentication) {
        CurrentUserResponse currentUserResponse = authService.getCurrentUser(authentication);
        Long companyId = currentUserResponse.getCompanyId();

        QuestionAnswerAdvisor questionAnswerAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
                .searchRequest(SearchRequest.builder()
                        .topK(10)
                        .similarityThreshold(0.7)
                        .filterExpression("companyId == '" + companyId + "'")
                        .build())
                .build();

        return chatClient
                .prompt()
                .user(query)
                .advisors(questionAnswerAdvisor)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, chatId))
                .stream().content();
    }
}
