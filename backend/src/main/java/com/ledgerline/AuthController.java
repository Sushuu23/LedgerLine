
package com.ledgerline;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    // Registration API
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request) {

        try {
            userService.registerUser(
                request.fullName(),
                request.email(),
                request.password()
            );

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Registration successful!"));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
        }
    }

    // Authentication check API
    @GetMapping("/check")
    public String checkAuthentication(
            Authentication authentication) {

        return "Welcome " + authentication.getName()
                + "! Authentication successful.";
    }
}
