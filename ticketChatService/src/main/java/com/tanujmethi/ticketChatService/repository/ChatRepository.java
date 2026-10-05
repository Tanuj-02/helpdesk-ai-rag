package com.tanujmethi.ticketChatService.repository;

import com.tanujmethi.ticketChatService.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatRepository extends JpaRepository<Chat,Long> {
    Optional<Chat> findByTicketId(Long ticketId);
}
