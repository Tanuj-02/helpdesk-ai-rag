package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.CompanyDocument;
import com.tanujmethi.raghelpdesk.enums.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.List;

@Repository
public interface CompanyDocumentRepository extends JpaRepository<CompanyDocument, Long> {
    List<CompanyDocument> findByCompanyId(Long companyId);

    Optional<CompanyDocument> findByIdAndCompanyId(Long id, Long companyId);

    @Modifying
    @Transactional
    @Query("update CompanyDocument d set d.status = :status, d.rejectionReason = :reason " +
            "where d.id = :documentId and d.company.id = :companyId and d.status <> :deleted")
    int updateVerificationResultIfNotDeleted(Long documentId, Long companyId,
                                             DocumentStatus status, String reason, DocumentStatus deleted);
}
