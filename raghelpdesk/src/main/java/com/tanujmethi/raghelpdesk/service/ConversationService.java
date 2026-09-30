package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.ConversationResponse;
import com.tanujmethi.raghelpdesk.dto.MessageResponse;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.Conversation;
import com.tanujmethi.raghelpdesk.entity.Message;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.MessageRole;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.repository.ConversationRepository;
import com.tanujmethi.raghelpdesk.repository.MessageRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ConversationService {
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public ConversationService(ConversationRepository conversationRepository, MessageRepository messageRepository, CurrentUserService currentUserService,
                               UserRepository userRepository,
                               CompanyRepository companyRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
    }

    public Conversation createConversation(){
        Long userId = currentUserService.getUserId();
        Long companyId = currentUserService.getCompanyId();

        User user = userRepository.findById(userId).orElseThrow(
                () -> new AppException("User not found")
        );

        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new AppException("Company not found")
        );

        Conversation conversation = Conversation.builder()
                .user(user)
                .company(company)
                .build();

        return conversationRepository.save(conversation);
    }

    public void saveMessage(Long conversationId, MessageRole role, String content){
        Conversation conversation = conversationRepository.findById(conversationId).orElseThrow(
                () -> new AppException("Conversation not found")
        );

        Message message = Message.builder()
                .content(content)
                .conversation(conversation)
                .role(role)
                .build();

        messageRepository.save(message);
    }

    public void updateTitle(Long conversationId, String title) {

        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() ->
                        new AppException("Conversation not found"));

        conversation.setTitle(title);

        conversationRepository.save(conversation);
    }

    public Conversation getConversation(Long chatId) {
        return conversationRepository.findById(chatId).orElseThrow(
                () -> new AppException("Conversation not found")
        );
    }

    public Page<MessageResponse> getMessages(
            Long conversationId,
            Pageable pageable
    ) {

        Long userId = currentUserService.getUserId();

        conversationRepository.findByIdAndUserId(
                conversationId,
                userId
        ).orElseThrow(() ->
                new AppException("Conversation not found")
        );

        return messageRepository
                .findByConversationIdOrderByCreatedAtDesc(
                        conversationId,
                        pageable
                )
                .map(this::convertToResponse);
    }

    private MessageResponse convertToResponse(Message message) {

        return MessageResponse.builder()
                .id(message.getId())
                .role(message.getRole())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }

    public Page<ConversationResponse> getMyConversations(Pageable pageable) {

        Long userId = currentUserService.getUserId();

        return conversationRepository
                .findByUserIdOrderByUpdatedAtDesc(userId, pageable)
                .map(conversation -> ConversationResponse.builder()
                        .id(conversation.getId())
                        .title(conversation.getTitle())
                        .createdAt(conversation.getCreatedAt())
                        .build());
    }
}
