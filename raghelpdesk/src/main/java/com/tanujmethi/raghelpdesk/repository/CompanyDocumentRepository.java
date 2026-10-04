package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.CompanyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface CompanyDocumentRepository extends JpaRepository<CompanyDocument, Long> {
    List<CompanyDocument> findByCompanyId(Long companyId);

    Optional<CompanyDocument> findByIdAndCompanyId(Long id, Long companyId);
}
