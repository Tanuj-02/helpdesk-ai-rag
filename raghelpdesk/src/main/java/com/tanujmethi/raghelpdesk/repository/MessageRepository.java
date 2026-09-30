package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByConversationIdOrderByCreatedAtDesc(
            Long conversationId,
            Pageable pageable
    );
}
