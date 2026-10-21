package com.tanujmethi.raghelpdesk.service;

import com.google.genai.Client;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatClientManager {

    private final Map<Long, ChatClient> clientMap = new ConcurrentHashMap<>();
    private final Map<Long, ChatClient> titleClientMap = new ConcurrentHashMap<>();

    public ChatClient getOrCreate(Long companyId, String apiKey, ChatMemory chatMemory) {
        return clientMap.computeIfAbsent(companyId, id -> createChatClient(apiKey, chatMemory));
    }

    public void invalidate(Long companyId) {
        clientMap.remove(companyId);
        titleClientMap.remove(companyId);
    }

    private ChatClient createChatClient(String apiKey, ChatMemory chatMemory) {
        Client genAiClient = Client.builder()
                .apiKey(apiKey)
                .build();

        GoogleGenAiChatModel chatModel = GoogleGenAiChatModel.builder()
                        .genAiClient(genAiClient)
                        .build();

        return ChatClient.builder(chatModel)
                .defaultAdvisors(
                        MessageChatMemoryAdvisor.builder(chatMemory).build()
                )
                .build();
    }


    public ChatClient getOrCreateTitleClient(Long companyId, String apiKey) {
        return titleClientMap.computeIfAbsent(companyId, id -> {
            Client genAiClient = Client.builder().apiKey(apiKey).build();
            GoogleGenAiChatModel model = GoogleGenAiChatModel.builder().genAiClient(genAiClient).build();
            return ChatClient.builder(model).build();
        });
    }
}
