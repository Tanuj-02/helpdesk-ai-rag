package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByIdAndUserId(
            Long conversationId,
            Long userId
    );

    Page<Conversation> findByUserIdOrderByUpdatedAtDesc(Long userId, Pageable pageable);
}
