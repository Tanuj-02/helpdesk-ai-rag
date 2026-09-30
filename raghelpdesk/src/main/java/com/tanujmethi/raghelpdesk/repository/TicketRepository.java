package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.Ticket;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Page<Ticket> findByUserId(Long userId, Pageable pageable);

    Page<Ticket> findByCompanyId(Long companyId, Pageable pageable);

    Page<Ticket> findByAgentId(Long agentId, Pageable pageable);

    Optional<Ticket> findByIdAndCompanyId(Long ticketId, Long companyId);

    List<Ticket> findByUserIdAndSubjectContainingIgnoreCase(Long userId, String query);
}
