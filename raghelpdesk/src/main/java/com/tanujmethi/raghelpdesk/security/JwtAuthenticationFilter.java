package com.tanujmethi.raghelpdesk.security;

import com.tanujmethi.raghelpdesk.dto.CurrentUser;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        System.out.println("DISPATCH TYPE: " + request.getDispatcherType());
        System.out.println("REQUEST URI: " + request.getRequestURI());

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        try {

            String tokenType = jwtService.extractTokenType(token);

            if (!"ACCESS".equals(tokenType)) {
                filterChain.doFilter(request, response);
                return;
            }

            Long userId = jwtService.extractUserId(token);

            if (userId == null) {
                filterChain.doFilter(request, response);
                return;
            }

            User user = userRepository.findById(userId).orElseThrow(null);

            if(user == null){
                filterChain.doFilter(request,response); return;
            }

            Long tokenVersion = jwtService.extractTokenVersion(token);

            if(tokenVersion == null || !tokenVersion.equals(user.getTokenVersion())){
                filterChain.doFilter(request,response); return;
            }

            String email = jwtService.extractEmail(token);

            if (email != null &&
                    SecurityContextHolder.getContext().getAuthentication() == null) {

                if (jwtService.isTokenValid(token)) {

                    CurrentUser currentUser = new CurrentUser(
                            userId,
                            jwtService.extractCompanyId(token),
                            email,
                            jwtService.extractRole(token)
                    );

                    UsernamePasswordAuthenticationToken authenticationToken =
                            new UsernamePasswordAuthenticationToken(
                                    currentUser,
                                    null,
                                    List.of(
                                            new SimpleGrantedAuthority(
                                                    "ROLE_" + currentUser.role()
                                            )
                                    )
                            );

                    authenticationToken.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    SecurityContextHolder.getContext()
                            .setAuthentication(authenticationToken);

                    System.out.println("AUTHENTICATED: " +
                            currentUser.email());
                }
            }

        } catch (Exception e) {
            SecurityContextHolder.clearContext();

            System.out.println("Invalid JWT: " + e.getClass().getSimpleName());
        }

        filterChain.doFilter(request, response);
    }
}
