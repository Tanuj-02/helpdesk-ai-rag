package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AgentAssignmentService {

    private final UserRepository userRepository;

    public AgentAssignmentService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User leastBusyAgent(Long companyId){
        List<TicketStatus> activeStatuses = List.of(
                TicketStatus.OPEN,
                TicketStatus.IN_PROGRESS
        );

        return userRepository.findLeastBusyAgent(
                        companyId,
                        Role.AGENT,
                        activeStatuses,
                        PageRequest.of(0, 1)
                ).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No available agent"));
    }
}
