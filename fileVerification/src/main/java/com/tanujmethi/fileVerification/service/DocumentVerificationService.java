package com.tanujmethi.fileVerification.service;

import com.tanujmethi.fileVerification.dto.DocumentVerificationResult;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class DocumentVerificationService {

    private final ChatClient chatClient;

    @Value("classpath:/prompts/verification.st")
    private Resource verificationPrompt;

    public DocumentVerificationService(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    public DocumentVerificationResult verify(
            String content,
            String documentType
    ) {

        return chatClient
                .prompt()
                .user(u -> u
                        .text(verificationPrompt)
                        .param("content", content)
                        .param("documentType", documentType)
                )
                .call()
                .entity(DocumentVerificationResult.class);
    }
}
