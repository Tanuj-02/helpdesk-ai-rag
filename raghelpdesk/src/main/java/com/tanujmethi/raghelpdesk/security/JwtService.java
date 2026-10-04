package com.tanujmethi.raghelpdesk.security;

import com.tanujmethi.raghelpdesk.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;
    @Value("${jwt.expiration}")
    private Long expiration;
    @Value("${jwt.invitation-expiration}")
    private Long invitationExpiration;

    public String generateToken(User user){

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("companyId", user.getCompany().getId())
                .claim("role", user.getRole().name())
                .claim("type", "ACCESS")
                .claim("tokenVersion", user.getTokenVersion())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token){
        return extractAllClaims(token).getSubject();
    }

    public Long extractUserId(String token){
        return extractAllClaims(token).get("userId", Long.class);
    }

    public Long extractCompanyId(String token){
        return extractAllClaims(token).get("companyId", Long.class);
    }

    public String extractRole(String token){
        return extractAllClaims(token).get("role", String.class);
    }

    public String extractTokenType(String token){
        return extractAllClaims(token).get("type", String.class);
    }

    public Long extractTokenVersion(String token){
        return extractAllClaims(token).get("tokenVersion", Long.class);
    }

    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateInvitationToken(String email, Long companyId, String role){
        return Jwts.builder()
                .subject(email)
                .claim("companyId", companyId)
                .claim("role", role)
                .claim("type", "INVITATION")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + invitationExpiration))
                .signWith(getSigningKey())
                .compact();
    }


    public boolean isInvitationToken(String token){

        Claims claims = extractAllClaims(token);

        return "INVITATION".equals(claims.get("type", String.class))
                &&
                claims.getExpiration().after(new Date());
    }
}
