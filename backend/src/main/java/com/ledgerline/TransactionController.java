
package com.ledgerline;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    // DEPOSIT
    @PostMapping("/deposit/{accountNumber}")
    public ResponseEntity<?> deposit(
            @PathVariable String accountNumber,
            @Valid @RequestBody DepositRequest request,
            Authentication authentication) {

        try {
            Transaction transaction = transactionService.deposit(
                    accountNumber,
                    request.amount(),
                    authentication.getName()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of(
                            "message", "Deposit successful",
                            "transactionId", transaction.getId()
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", e.getMessage())
            );

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    // WITHDRAWAL
    @PostMapping("/withdraw/{accountNumber}")
    public ResponseEntity<?> withdraw(
            @PathVariable String accountNumber,
            @Valid @RequestBody DepositRequest request,
            Authentication authentication) {

        try {
            Transaction transaction = transactionService.withdraw(
                    accountNumber,
                    request.amount(),
                    authentication.getName()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of(
                            "message", "Withdrawal successful",
                            "transactionId", transaction.getId()
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", e.getMessage())
            );

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    // TRANSFER
    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(
            @Valid @RequestBody TransferRequest request,
            Authentication authentication) {

        try {
            Transaction transaction = transactionService.transfer(
                    request.fromAccount(),
                    request.toAccount(),
                    request.amount(),
                    authentication.getName()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of(
                            "message", "Transfer successful",
                            "transactionId", transaction.getId()
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", e.getMessage())
            );

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    // TRANSACTION HISTORY
    @GetMapping("/history")
    public ResponseEntity<?> getTransactionHistory(
            Authentication authentication) {

        try {
            List<Transaction> transactions =
                    transactionService.getTransactionHistory(
                            authentication.getName()
                    );

            List<Map<String, Object>> response = transactions.stream()
                    .map(transaction -> {
                        Map<String, Object> item = new java.util.HashMap<>();

                        item.put("transactionId", transaction.getId());
                        item.put("accountNumber",
                                transaction.getAccount().getAccountNumber());
                        item.put("amount", transaction.getAmount());
                        item.put("type", transaction.getType());
                        item.put("createdAt", transaction.getCreatedAt());

                        return item;
                    })
                    .toList();

            return ResponseEntity.ok(response);

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of("error", e.getMessage())
            );
        }
    }
}
