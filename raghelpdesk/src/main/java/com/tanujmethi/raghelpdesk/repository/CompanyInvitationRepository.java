package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.CompanyInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyInvitationRepository extends JpaRepository<CompanyInvitation, Long> {
    Optional<CompanyInvitation> findByToken(String token);
}
