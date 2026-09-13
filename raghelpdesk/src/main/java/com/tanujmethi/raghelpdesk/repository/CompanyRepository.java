package com.tanujmethi.raghelpdesk.repository;

import com.tanujmethi.raghelpdesk.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    boolean existsByEmail(String companyEmail);
}
