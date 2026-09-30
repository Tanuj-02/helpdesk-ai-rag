package com.tanujmethi.raghelpdesk.dto;

public record CurrentUser(
        Long userId,
        Long companyId,
        String email,
        String role
) {}
