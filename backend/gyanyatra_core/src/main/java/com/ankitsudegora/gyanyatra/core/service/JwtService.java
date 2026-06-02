package com.ankitsudegora.gyanyatra.core.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.Date;

@Service
public class JwtService {
    @Value("${gyanyatra.jwt.secret:defaultSecretKeyKeepItSecureAndLongEnoughToAvoidSignatureExceptions}")
    private String secret;

    private static final long EXPIRATION_TIME = 864000000; // 10 days in milliseconds

    public String generateToken(String userId, String email) {
        return JWT.create()
                .withSubject(userId)
                .withClaim("email", email)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .sign(Algorithm.HMAC256(secret));
    }

    public String validateTokenAndGetUserId(String token) {
        try {
            DecodedJWT jwt = JWT.require(Algorithm.HMAC256(secret))
                    .build()
                    .verify(token);
            return jwt.getSubject();
        } catch (Exception e) {
            return null; // invalid token
        }
    }
}
