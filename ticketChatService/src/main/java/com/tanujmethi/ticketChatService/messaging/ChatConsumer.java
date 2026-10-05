package com.tanujmethi.ticketChatService.messaging;

import com.tanujmethi.ticketChatService.dto.ChatRequest;
import com.tanujmethi.ticketChatService.entity.Chat;
import com.tanujmethi.ticketChatService.repository.ChatRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

public class ChatConsumer {

    private final ChatRepository chatRepository;

    public ChatConsumer(ChatRepository chatRepository) {
        this.chatRepository = chatRepository;
    }

    @RabbitListener(queues = "document.chat.queue")
    public void createTicket(ChatRequest request){
        Chat chat = Chat.builder()
                .ticketId(request.getTicketId())
                .agentId(request.getAgentId())
                .companyId(request.getCompanyId())
                .userId(request.getUserId())
                .build();
        chatRepository.save(chat);
    }
}
