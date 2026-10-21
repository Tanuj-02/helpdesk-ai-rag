package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.ConversationResponse;
import com.tanujmethi.raghelpdesk.dto.MessageResponse;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.Conversation;
import com.tanujmethi.raghelpdesk.entity.Message;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.MessageRole;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.exception.ResourceNotFoundException;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.repository.ConversationRepository;
import com.tanujmethi.raghelpdesk.repository.MessageRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

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

    public ConversationResponse createConversation(){
        Long userId = currentUserService.getUserId();
        Long companyId = currentUserService.getCompanyId();

        User user = userRepository.findById(userId).orElseThrow(
                () -> new ResourceNotFoundException("User with " + userId + " not found")
        );

        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new ResourceNotFoundException("Company with " + companyId + " not found")
        );

        Conversation conversation = Conversation.builder()
                .user(user)
                .company(company)
                .build();

        conversationRepository.save(conversation);

        return ConversationResponse.builder()
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .id(conversation.getId())
                .title(conversation.getTitle())
                .build();
    }

    public void saveMessage(Long conversationId, Long userId, MessageRole role, String content){
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId).orElseThrow(
                () -> new ResourceNotFoundException("Conversation with " + conversationId + " not found")
        );

        Message message = Message.builder()
                .content(content)
                .conversation(conversation)
                .role(role)
                .build();

        messageRepository.save(message);

        // Touch the parent conversation so the list can order by last activity.
        // Nothing else mutates this row, so without it `updatedAt` stays at
        // creation time and conversations never rise on a new message.
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);
    }

    public void updateTitle(Long conversationId, String title, Long userId) {
        Conversation conversation = conversationRepository
                .findByIdAndUserId(conversationId,userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Conversation with " + conversationId + " not found"));

        conversation.setTitle(title);

        conversationRepository.save(conversation);
    }

    public Conversation getConversation(Long chatId) {
        Long userId = currentUserService.getUserId();
        return conversationRepository.findByIdAndUserId(chatId,userId).orElseThrow(
                () -> new AppException("Conversation not found")
        );
    }

    public Page<MessageResponse> getMessages(Long conversationId, Pageable pageable) {

        Long userId = currentUserService.getUserId();

        conversationRepository.findByIdAndUserId(conversationId,userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation with " + conversationId + " not found")
        );

        return messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, pageable)
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
                        .updatedAt(conversation.getUpdatedAt())
                        .build());
    }

    public void updateModel(Long conversationId, String model) {
        Long userId = currentUserService.getUserId();

        Conversation conversation =
                conversationRepository
                        .findByIdAndUserId(conversationId, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Conversation with " + conversationId + " not found"));

        conversation.setModel(model);
        conversationRepository.save(conversation);
    }
}
