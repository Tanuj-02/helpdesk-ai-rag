package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.CompanyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyDocumentRepository extends JpaRepository<CompanyDocument, Long> {
}
