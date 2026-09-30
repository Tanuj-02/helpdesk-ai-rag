package com.tanujmethi.raghelpdesk.service.auth;

import com.tanujmethi.raghelpdesk.dto.CurrentUser;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserService {

    public CurrentUser get() {
        return (CurrentUser) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
    }

    public Long getUserId() {
        return get().userId();
    }

    public Long getCompanyId() {
        return get().companyId();
    }

    public String getEmail() {
        System.out.println(get().email());
        return get().email();
    }

    public String getRole() {
        return get().role();
    }
}
