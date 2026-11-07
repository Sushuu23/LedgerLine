
package com.ledgerline;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    public AccountController(
            AccountService accountService,
            UserRepository userRepository,
            AccountRepository accountRepository) {

        this.accountService = accountService;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
    }

    // Create account for the currently logged-in user
    @PostMapping
    public ResponseEntity<?> createAccount(
            Authentication authentication) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                    new IllegalArgumentException("User not found")
                );

        Account account =
                accountService.createAccount(user.getId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                    "message", "Account created successfully",
                    "accountNumber", account.getAccountNumber(),
                    "balance", account.getBalance(),
                    "currency", account.getCurrency()
                ));
    }

    // View only the current user's accounts
    @GetMapping("/me")
    public List<Map<String, Object>> getMyAccounts(
            Authentication authentication) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                    new IllegalArgumentException("User not found")
                );

        return accountRepository.findByOwnerId(user.getId())
                .stream()
                .map(account -> Map.<String, Object>of(
                    "accountNumber", account.getAccountNumber(),
                    "balance", account.getBalance(),
                    "currency", account.getCurrency()
                ))
                .toList();
    }
}

