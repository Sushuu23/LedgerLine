
package com.ledgerline;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DepositRequest(

    @NotNull(message = "Deposit amount is required")
    @DecimalMin(value = "0.01", message = "Deposit amount must be greater than zero")
    @Digits(
        integer = 17,
        fraction = 2,
        message = "Amount can have at most 2 decimal places"
    )
    BigDecimal amount

) {}
