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

@Service
@Slf4j
public class OtpService {
    private final Map<String, OtpDetails> otpCache = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    private static class OtpDetails {
        String otp;
        LocalDateTime expiry;

        OtpDetails(String otp, LocalDateTime expiry) {
            this.otp = otp;
            this.expiry = expiry;
        }
    }

    public String generateOtp(String email) {
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
        if (mailSender == null || fromEmail == null || fromEmail.trim().isEmpty()) {
            log.warn("SMTP email sender is not fully configured (spring.mail.username is empty). Skipping email dispatch.");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("GyanYatra Seeker Security Verification");
            message.setText("Welcome to GyanYatra!\n\nYour security verification OTP code is: " + otp + "\n\nThis code will expire in 5 minutes.\n\nPath of Knowledge.");
            mailSender.send(message);
            log.info("OTP email successfully sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", email, e.getMessage(), e);
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
