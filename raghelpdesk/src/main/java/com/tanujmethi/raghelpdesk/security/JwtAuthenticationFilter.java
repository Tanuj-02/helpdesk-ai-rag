package com.tanujmethi.raghelpdesk.security;

import com.tanujmethi.raghelpdesk.dto.CurrentUser;
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

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        System.out.println("DISPATCH TYPE: " + request.getDispatcherType());
        System.out.println("REQUEST URI: " + request.getRequestURI());
        System.out.println("REQUEST: " + request.getRequestURI());
        System.out.println("AUTH HEADER: " + request.getHeader("Authorization"));
        if(authHeader == null || !authHeader.startsWith("Bearer ")){
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        String email = jwtService.extractEmail(token);

        if (email != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

            if (jwtService.isTokenValid(token)) {

                CurrentUser currentUser = new CurrentUser(
                        jwtService.extractUserId(token),
                        jwtService.extractCompanyId(token),
                        jwtService.extractEmail(token),
                        jwtService.extractRole(token)
                );

                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(
                                currentUser,
                                null,
                                // authorities
                                List.of(new SimpleGrantedAuthority(
                                        "ROLE_" + currentUser.role()
                                ))
                        );

                authenticationToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                        .setAuthentication(authenticationToken);

                System.out.println("AUTHENTICATED: " +
                        SecurityContextHolder.getContext().getAuthentication());
            }
        }

        filterChain.doFilter(request,response);
    }
}
