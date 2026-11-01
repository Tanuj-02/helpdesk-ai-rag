package com.tanujmethi.ticketChatService.repository;

import com.tanujmethi.ticketChatService.entity.ChatUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ChatUserRepository extends JpaRepository<ChatUser, Long> {
    Optional<ChatUser> findByIdAndCompanyId(Long id, Long companyId);

    List<ChatUser> findByIdInAndCompanyId(Collection<Long> ids, Long companyId);
}
