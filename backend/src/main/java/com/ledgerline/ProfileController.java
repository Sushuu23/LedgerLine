
package com.ledgerline;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // GET USER PROFILE
    @GetMapping
    public ResponseEntity<?> getProfile(Authentication authentication) {

        return userRepository.findByEmail(authentication.getName())
                .map(user -> ResponseEntity.ok(Map.of(
                        "fullName", user.getFullName(),
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "phoneNumber", user.getPhoneNumber() == null
                                ? "" : user.getPhoneNumber()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE PHONE NUMBER
    @PutMapping("/phone")
    public ResponseEntity<?> updatePhone(
            Authentication authentication,
            @RequestBody Map<String, String> request) {

        String phoneNumber = request.get("phoneNumber");

        if (phoneNumber == null ||
                !phoneNumber.matches("^[0-9]{10}$")) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error", "Enter a valid 10-digit phone number."
                    ));
        }

        return userRepository.findByEmail(authentication.getName())
                .map(user -> {
                    user.setPhoneNumber(phoneNumber);
                    userRepository.save(user);

                    return ResponseEntity.ok(Map.of(
                            "message", "Phone number updated successfully.",
                            "phoneNumber", phoneNumber
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
