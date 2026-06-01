package com.ankitsudegora.gyanyatra.core.service;

import lombok.extern.slf4j.Slf4j;
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
        return otp;
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
