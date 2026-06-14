package com.ankitsudegora.gyanyatra.core.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@Slf4j
public class OtpService {
    private final Map<String, OtpDetails> otpCache = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${gyanyatra.brevo.api-key:}")
    private String brevoApiKey;

    @Value("${gyanyatra.brevo.sender-email:gyanyatra.mail@gmail.com}")
    private String brevoSenderEmail;

    private final HttpClient httpClient = HttpClient.newBuilder().build();


    private static class OtpDetails {
        String otp;
        LocalDateTime expiry;
        LocalDateTime createdAt;

        OtpDetails(String otp, LocalDateTime expiry) {
            this.otp = otp;
            this.expiry = expiry;
            this.createdAt = LocalDateTime.now();
        }
    }

    public String generateOtp(String email) {
        OtpDetails existing = otpCache.get(email);
        if (existing != null) {
            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(existing.createdAt.plusSeconds(60))) {
                long secondsLeft = 60 - java.time.Duration.between(existing.createdAt, now).toSeconds();
                secondsLeft = Math.max(1, Math.min(60, secondsLeft));
                throw new IllegalStateException("Rate limit exceeded. Please wait " + secondsLeft + " seconds before requesting a new OTP.");
            }
        }

        String otp = String.format("%06d", random.nextInt(1000000));
        otpCache.put(email, new OtpDetails(otp, LocalDateTime.now().plusMinutes(5)));
        log.info("Generated OTP for {}: {}", email, otp);
        System.out.println("========================================");
        System.out.println("GYANYATRA SECURITY SUTRA: OTP GENERATED");
        System.out.println("Email: " + email);
        System.out.println("OTP: " + otp);
        System.out.println("========================================");
        
        // Dispatch actual email asynchronously in a virtual thread to prevent blocking the REST API
        Thread.startVirtualThread(() -> sendOtpEmail(email, otp));
        
        return otp;
    }

    private void sendOtpEmail(String email, String otp) {
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            sendOtpEmailViaBrevo(email, otp);
            return;
        }

        // Fallback to standard SMTP
        if (mailSender == null || fromEmail == null || fromEmail.trim().isEmpty()) {
            log.warn("SMTP email sender is not fully configured (spring.mail.username is empty) and Brevo API key is missing. Skipping email dispatch.");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("GyanYatra Seeker Security Verification");
            message.setText("Welcome to GyanYatra!\n\nYour security verification OTP code is: " + otp + "\n\n" +
                    "To access the application, please visit: http://localhost:5173\n\n" +
                    "This code will expire in 5 minutes. If you did not request this verification code, please ignore this email.\n\n" +
                    "Path of Knowledge.");
            mailSender.send(message);
            log.info("OTP email successfully sent to: {} via SMTP", email);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {} via SMTP: {}", email, e.getMessage(), e);
        }
    }

    private void sendOtpEmailViaBrevo(String email, String otp) {
        log.info("Attempting to send OTP email via Brevo HTTP API to: {}", email);
        try {
            String jsonPayload = String.format(
                "{\"sender\":{\"name\":\"GyanYatra\",\"email\":\"%s\"},\"to\":[{\"email\":\"%s\",\"name\":\"Seeker\"}],\"subject\":\"GyanYatra Seeker Security Verification\",\"htmlContent\":\"<p>Welcome to GyanYatra!</p><p>Your security verification OTP code is: <strong>%s</strong></p><p>To access the application, please visit: <a href=\\\"http://localhost:5173\\\">http://localhost:5173</a></p><p>This code will expire in 5 minutes. If you did not request this verification code, please ignore this email.</p><p><i>Path of Knowledge.</i></p>\"}",
                brevoSenderEmail, email, otp
            );

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", brevoApiKey.trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("OTP email successfully sent to: {} via Brevo HTTP API", email);
            } else {
                log.error("Brevo HTTP API returned error status {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("Failed to send OTP email to {} via Brevo HTTP API: {}", email, e.getMessage(), e);
        }
    }


    public boolean validateOtp(String email, String otp) {
        OtpDetails details = otpCache.get(email);
        if (details == null) {
            log.warn("No OTP details found for email: {}", email);
            return false;
        }
        if (LocalDateTime.now().isAfter(details.expiry)) {
            log.warn("OTP expired for email: {}", email);
            otpCache.remove(email);
            return false;
        }
        boolean isValid = details.otp.equals(otp);
        if (isValid) {
            otpCache.remove(email); // consume OTP on success
            log.info("Successfully validated OTP for email: {}", email);
        } else {
            log.warn("Invalid OTP attempt for email: {}", email);
        }
        return isValid;
    }
}
