package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.ApiKeyRequest;
import com.tanujmethi.raghelpdesk.dto.AiConfigResponse;
import com.tanujmethi.raghelpdesk.service.AiConfigService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/ai-config")
public class AiConfigController {

    private final AiConfigService aiConfigService;

    public AiConfigController(AiConfigService aiConfigService) {
        this.aiConfigService = aiConfigService;
    }

    @GetMapping
    public ResponseEntity<AiConfigResponse> getConfig() {

        return ResponseEntity.ok(aiConfigService.getConfig());
    }

    @PutMapping
    public ResponseEntity<AiConfigResponse> updateConfig(@RequestBody ApiKeyRequest request) {

        return ResponseEntity.ok(aiConfigService.updateConfig(request));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteConfig() {

        aiConfigService.deleteConfig();

        return ResponseEntity.noContent().build();
    }
}