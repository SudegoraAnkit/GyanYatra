package com.ankitsudegora.gyanyatra.api.security;

import com.ankitsudegora.gyanyatra.core.service.JwtService;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.io.IOException;

/**
 * Filter to validate JSON Web Tokens for secure endpoints.
 * Public routes: Login OTP endpoints, Leaderboard, and pre-flight OPTIONS requests.
 */
@Component
@RequiredArgsConstructor
public class JwtFilter implements Filter {

    private final JwtService jwtService;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();

        // 1. Exclude public endpoints and preflight CORS requests from authentication
        if (path.startsWith("/api/v1/yatra/users/login/otp") || 
            path.equals("/api/v1/yatra/users/leaderboard") ||
            httpRequest.getMethod().equalsIgnoreCase("OPTIONS")) {
            chain.doFilter(request, response);
            return;
        }

        // 2. Validate Bearer Token for all protected routes
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String userId = jwtService.validateTokenAndGetUserId(token);
            if (userId != null) {
                // Attach user context to the request thread
                httpRequest.setAttribute("userId", userId);
                chain.doFilter(request, response);
                return;
            }
        }

        // Return 401 Unauthorized for invalid/missing tokens
        httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        httpResponse.setContentType("application/json");
        httpResponse.getWriter().write("{\"error\": \"Unauthorized. Access token is missing, invalid or expired.\"}");
    }
}
