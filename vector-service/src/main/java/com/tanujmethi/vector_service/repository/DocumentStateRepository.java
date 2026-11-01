package com.tanujmethi.vector_service.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class DocumentStateRepository {
    private final JdbcTemplate jdbcTemplate;

    public DocumentStateRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> statusOf(Long companyId, Long documentId) {
        List<String> statuses = jdbcTemplate.query(
                "SELECT status FROM company_document WHERE id = ? AND company_id = ?",
                (resultSet, rowNum) -> resultSet.getString("status"),
                documentId, companyId);
        return statuses.stream().findFirst();
    }
}
