package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String adminEmail);

    Optional<User> findByEmail(String email);

    Page<User> findAllByCompanyId(Long companyId, Pageable pageable);

    Optional<User> findByIdAndCompanyId(Long id, Long companyId);

    Optional<User> findByIdAndCompanyIdAndRoleIn(Long id, Long companyId, List<Role> employee);


    @Query("""
    SELECT u
    FROM User u
    LEFT JOIN Ticket t
        ON t.agent = u
        AND t.ticketStatus IN :statuses
    WHERE u.company.id = :companyId
      AND u.role = :role
    GROUP BY u
    ORDER BY COUNT(t.id) ASC
""")
    List<User> findLeastBusyAgent(
            @Param("companyId") Long companyId,
            @Param("role") Role role,
            @Param("statuses") List<TicketStatus> statuses,
            Pageable pageable
    );

    boolean existsByEmailIgnoreCase(String email);
}
