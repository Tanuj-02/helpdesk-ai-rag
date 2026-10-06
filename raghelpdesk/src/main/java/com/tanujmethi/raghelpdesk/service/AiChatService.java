package com.tanujmethi.raghelpdesk.service;

import com.google.genai.Client;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.Conversation;
import com.tanujmethi.raghelpdesk.enums.MessageRole;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import com.tanujmethi.raghelpdesk.tools.TicketTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class AiChatService {

    @Value("${spring.ai.google.genai.chat.model}")
    private String defaultModel;

    private final VectorStore vectorStore;
    private final CurrentUserService currentUserService;
    private final TicketTool ticketTool;
    private final ConversationService conversationService;
    private final CompanyRepository companyRepository;
    private final ChatMemory chatMemory;

    public AiChatService(VectorStore vectorStore, CurrentUserService currentUserService, TicketTool ticketTool, ConversationService conversationService, CompanyRepository companyRepository, ChatMemory chatMemory) {
        this.vectorStore = vectorStore;
        this.currentUserService = currentUserService;
        this.ticketTool = ticketTool;
        this.conversationService = conversationService;
        this.companyRepository = companyRepository;
        this.chatMemory = chatMemory;
    }

    public Flux<String> chat(String query, Long chatId, String model) {

        Long companyId = currentUserService.getCompanyId();
        Long userId = currentUserService.getUserId();

        Conversation conversation =
                conversationService.getConversation(chatId);

        String selectedModel = model;

        if (selectedModel == null || selectedModel.isBlank()) {
            selectedModel = conversation.getModel();
        }

        if (selectedModel == null || selectedModel.isBlank()) {
            selectedModel = defaultModel;
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        if (company.getApiKey() == null || company.getApiKey().isBlank()) {
            throw new RuntimeException("AI API key is not configured");
        }

        String apiKey = company.getApiKey();
        ChatClient chatClient = createChatClient(apiKey);

        conversationService.saveMessage(
                chatId,
                userId,
                MessageRole.USER,
                query
        );

        if (conversation.getTitle() == null) {

            CompletableFuture.runAsync(() -> {

                String title = generateTitle(query, chatClient);

                conversationService.updateTitle(
                        chatId,
                        title,
                        userId
                );
            });
        }

        QuestionAnswerAdvisor questionAnswerAdvisor =
                QuestionAnswerAdvisor.builder(vectorStore)
                        .searchRequest(
                                SearchRequest.builder()
                                        .topK(10)
                                        .similarityThreshold(0.4)
                                        .filterExpression(
                                                "companyId == '" + companyId + "'"
                                        )
                                        .build()
                        )
                        .build();

        StringBuilder aiResponse = new StringBuilder();

        return chatClient
                .prompt()
                .user(query)
                .options(
                        GoogleGenAiChatOptions.builder()
                                .model(selectedModel)
                )
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
                .doOnComplete(() ->
                        conversationService.saveMessage(
                                chatId,
                                userId,
                                MessageRole.ASSISTANT,
                                aiResponse.toString()
                        )
                );
    }

    private ChatClient createChatClient(String apiKey) {

        Client genAiClient = Client.builder()
                .apiKey(apiKey)
                .build();

        GoogleGenAiChatModel chatModel =
                GoogleGenAiChatModel.builder()
                        .genAiClient(genAiClient)
                        .build();

        return ChatClient.builder(chatModel)
                .defaultAdvisors(
                        MessageChatMemoryAdvisor
                                .builder(chatMemory)
                                .build()
                )
                .build();
    }

    private String generateTitle(String query, ChatClient chatClient) {

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