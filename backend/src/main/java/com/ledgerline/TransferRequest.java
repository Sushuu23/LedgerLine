package com.ledgerline;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record TransferRequest(

    @NotBlank(message = "Source account number is required")
    String fromAccount,

    @NotBlank(message = "Destination account number is required")
    String toAccount,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 17, fraction = 2)
    BigDecimal amount

) {}