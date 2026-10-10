package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.AiConfigResponse;
import com.tanujmethi.raghelpdesk.dto.ApiKeyRequest;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.exception.ResourceNotFoundException;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AiConfigService {
    private final CompanyRepository companyRepository;
    private final CurrentUserService currentUserService;
    private final ChatClientManager chatClientManager;

    public AiConfigService(CompanyRepository companyRepository, CurrentUserService currentUserService, ChatClientManager chatClientManager) {
        this.companyRepository = companyRepository;
        this.currentUserService = currentUserService;
        this.chatClientManager = chatClientManager;
    }

    public AiConfigResponse getConfig(){
        Company company = companyRepository.findById(currentUserService.getCompanyId()).orElseThrow(() -> new ResourceNotFoundException("Company with " + currentUserService.getCompanyId() + " not found"));

        String apiKey = company.getApiKey();

        if(apiKey == null || apiKey.isBlank()){
            return AiConfigResponse.builder()
                    .apiKey(null)
                    .configured(false)
                    .updatedAt(null)
                    .build();
        }

        return AiConfigResponse.builder()
                .configured(true)
                .apiKey(maskKey(apiKey))
                .updatedAt(company.getApiUpdatedAt())
                .build();
    }

    public AiConfigResponse updateConfig(ApiKeyRequest apiKeyRequest){
        Company company = companyRepository.findById(currentUserService.getCompanyId()).orElseThrow(() -> new ResourceNotFoundException("Company with " + currentUserService.getCompanyId() + " not found"));

        company.setApiKey(apiKeyRequest.getApiKey());
        company.setApiUpdatedAt(LocalDateTime.now());

        companyRepository.save(company);
        chatClientManager.invalidate(company.getId());
        return AiConfigResponse.builder()
                .configured(true)
                .apiKey(maskKey(apiKeyRequest.getApiKey()))
                .updatedAt(company.getApiUpdatedAt())
                .build();
    }

    public void deleteConfig(){
        Company company = companyRepository.findById(currentUserService.getCompanyId()).orElseThrow(
                () -> new ResourceNotFoundException("Company with " + currentUserService.getCompanyId() + " not found")
        );

        company.setApiKey(null);
        company.setApiUpdatedAt(null);

        companyRepository.save(company);
        chatClientManager.invalidate(company.getId());
    }

    private String maskKey(String apiKey) {
        if(apiKey.length() <= 8) return "••••••••";

        return apiKey.substring(0,4) + "••••••••" + apiKey.substring(apiKey.length()-4);
    }
}
