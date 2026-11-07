import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

const API = "http://localhost:8080";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Deposit");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [qrAccount, setQrAccount] = useState("");

  // PROFILE
  const [profile, setProfile] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const header = "Basic " + btoa(`${email.trim()}:${password}`);

      const response = await fetch(`${API}/api/auth/check`, {
        headers: { Authorization: header }
      });

      if (!response.ok) {
        setMessage(
          response.status === 401
            ? "Invalid email or password."
            : "Login failed. Please try again."
        );
        return;
      }

      setAuthHeader(header);
      setLoggedIn(true);

      await loadAccounts(header);
      await loadTransactions(header);
    } catch {
      setMessage("Cannot connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // LOAD ACCOUNTS
  const loadAccounts = async (header = authHeader) => {
    try {
      setAccountLoading(true);

      const response = await fetch(`${API}/api/accounts/me`, {
        headers: { Authorization: header }
      });

      if (!response.ok) {
        setMessage("Unable to load your accounts.");
        return;
      }

      const data = await response.json();
      setAccounts(data);

      setSelectedAccount((current) =>
        data.some((account) => account.accountNumber === current)
          ? current
          : data[0]?.accountNumber || ""
      );

      setFromAccount((current) =>
        data.some((account) => account.accountNumber === current)
          ? current
          : data[0]?.accountNumber || ""
      );

      setQrAccount((current) =>
        data.some((account) => account.accountNumber === current)
          ? current
          : data[0]?.accountNumber || ""
      );
    } catch {
      setMessage("Unable to connect to the accounts service.");
    } finally {
      setAccountLoading(false);
    }
  };

  // LOAD TRANSACTION HISTORY
  const loadTransactions = async (header = authHeader) => {
    try {
      setHistoryLoading(true);

      const response = await fetch(
        `${API}/api/transactions/history`,
        {
          headers: { Authorization: header }
        }
      );

      if (!response.ok) {
        setMessage("Unable to load transaction history.");
        return;
      }

      const data = await response.json();
      setTransactions(data);
    } catch {
      setMessage("Unable to connect to transaction history service.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // CREATE ACCOUNT
  const createAccount = async () => {
    try {
      setAccountLoading(true);
      setMessage("");

      const response = await fetch(`${API}/api/accounts`, {
        method: "POST",
        headers: { Authorization: authHeader }
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Account creation failed.");
        return;
      }

      setMessage("New account created successfully.");
      await loadAccounts();
    } catch {
      setMessage("Unable to create account.");
    } finally {
      setAccountLoading(false);
    }
  };

  // DEPOSIT AND WITHDRAW
  const handlePayment = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!selectedAccount) {
      setMessage("Please select an account.");
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(paymentAmount.trim())) {
      setMessage("Amount can have at most 2 decimal places.");
      return;
    }

    try {
      setPaymentLoading(true);

      const operation =
        paymentMode === "Deposit" ? "deposit" : "withdraw";

      const response = await fetch(
        `${API}/api/transactions/${operation}/${encodeURIComponent(selectedAccount)}`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ amount })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error || data.message || `${paymentMode} failed.`
        );
        return;
      }

      setMessage(
        `${paymentMode} successful! Amount: ₹${formatMoney(amount)}. Transaction ID: ${data.transactionId || data.id || "Recorded"}`
      );

      setPaymentAmount("");
      await loadAccounts();
      await loadTransactions();
    } catch {
      setMessage("Unable to connect to the transaction service.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // TRANSFER MONEY
  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!fromAccount || !toAccount.trim()) {
      setMessage("Please enter both source and destination accounts.");
      return;
    }

    if (fromAccount === toAccount.trim()) {
      setMessage("Source and destination accounts cannot be the same.");
      return;
    }

    const amount = Number(transferAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid transfer amount.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(transferAmount.trim())) {
      setMessage("Amount can have at most 2 decimal places.");
      return;
    }

    try {
      setTransferLoading(true);

      const response = await fetch(
        `${API}/api/transactions/transfer`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fromAccount: fromAccount,
            toAccount: toAccount.trim(),
            amount: amount
          })
        }
      );

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        setMessage(
          data.error ||
          data.message ||
          "Transfer failed. Please check the account details and balance."
        );
        return;
      }

      setMessage(
        `Transfer successful! ₹${formatMoney(amount)} transferred to ${toAccount.trim()}.`
      );

      setToAccount("");
      setTransferAmount("");

      await loadAccounts();
      await loadTransactions();
    } catch {
      setMessage("Unable to connect to the transfer service.");
    } finally {
      setTransferLoading(false);
    }
  };

  // LOAD PROFILE
  const loadProfile = async (header = authHeader) => {
    try {
      setProfileLoading(true);

      const response = await fetch(`${API}/api/profile`, {
        headers: { Authorization: header }
      });

      if (!response.ok) {
        setMessage("Unable to load profile information.");
        return;
      }

      const data = await response.json();
      setProfile(data);
      setPhoneNumber(data.phoneNumber || "");
    } catch {
      setMessage("Unable to connect to the profile service.");
    } finally {
      setProfileLoading(false);
    }
  };

  // SAVE PHONE NUMBER
  const savePhoneNumber = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!/^[0-9]{10}$/.test(phoneNumber.trim())) {
      setMessage("Enter a valid 10-digit phone number.");
      return;
    }

    try {
      setProfileSaving(true);

      const response = await fetch(`${API}/api/profile/phone`, {
        method: "PUT",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to update phone number.");
        return;
      }

      const savedPhone = data.phoneNumber || phoneNumber.trim();

      setPhoneNumber(savedPhone);
      setProfile((current) => ({
        ...(current || {}),
        phoneNumber: savedPhone
      }));

      setMessage("Phone number updated successfully.");
    } catch {
      setMessage("Unable to connect to the profile service.");
    } finally {
      setProfileSaving(false);
    }
  };

  // NAVIGATION
  const navigateTo = async (page) => {
    setActivePage(page);
    setMessage("");

    if (page === "Transactions") {
      await loadTransactions();
    }

    if (page === "Profile") {
      await loadAccounts();
      await loadProfile();
    }

    if (page === "Analytics") {
      await loadAccounts();
      await loadTransactions();
    }
  };

  // LOGOUT
  const logout = () => {
    setEmail("");
    setPassword("");
    setAuthHeader("");
    setAccounts([]);
    setTransactions([]);
    setSelectedAccount("");
    setPaymentAmount("");
    setFromAccount("");
    setToAccount("");
    setTransferAmount("");
    setQrAccount("");
    setProfile(null);
    setPhoneNumber("");
    setMessage("");
    setLoggedIn(false);
    setActivePage("Dashboard");
  };

  // TOTAL BALANCE
  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );

  // FORMAT MONEY
  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // FORMAT DATE
  function formatDate(dateValue) {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // LOGIN SCREEN
  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand-icon">L</div>
          <h1>LedgerLine</h1>

          <p className="tagline">
            Secure money movement. Proven by ledger.
          </p>

          <h2>Sign in to your account</h2>

          <p className="subtitle">
            Enter your registered credentials to continue.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="password">Password</label>

            <div className="password-box">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {message && (
            <p className="login-message">{message}</p>
          )}

          <p className="security-note">
            Protected by secure authentication
          </p>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">L</div>
          <span>LedgerLine</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav className="sidebar-nav">
          {[
            ["Dashboard", "▦"],
            ["Accounts", "▣"],
            ["Payments", "↗"],
            ["Transfer", "⇄"],
            ["Transactions", "⇄"],
            ["Analytics", "▥"]
          ].map(([page, symbol]) => (
            <button
              key={page}
              className={`nav-link ${
                activePage === page ? "active" : ""
              }`}
              onClick={() => navigateTo(page)}
            >
              <span className="nav-symbol">{symbol}</span>
              {page}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p className="nav-heading">ACCOUNT</p>

          <button
            className={`nav-link ${
              activePage === "Profile" ? "active" : ""
            }`}
            onClick={() => navigateTo("Profile")}
          >
            <span className="nav-symbol">◉</span>
            My Profile
          </button>

          <button className="nav-link" onClick={logout}>
            <span className="nav-symbol">↪</span>
            Logout
          </button>

          <div className="profile-mini">
            <div className="profile-avatar">
              {email.charAt(0).toUpperCase()}
            </div>

            <div className="profile-mini-info">
              <strong>Account Holder</strong>
              <span>{email}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <h2>{activePage}</h2>
            <p>LedgerLine Financial Management</p>
          </div>

          <div className="topbar-right">
            <span className="secure-label">
              <span className="status-dot"></span>
              Secure Session
            </span>

            <div className="topbar-avatar">
              {email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <>
              <section className="page-heading">
                <div>
                  <h1>Account Overview</h1>
                  <p>
                    Monitor your balances and manage your accounts.
                  </p>
                </div>
              </section>

              <section className="balance-card">
                <div>
                  <span className="balance-label">
                    TOTAL ACCOUNT BALANCE
                  </span>

                  <h2>₹{formatMoney(totalBalance)}</h2>

                  <p>
                    Combined balance across your accounts
                  </p>
                </div>

                <div className="balance-symbol">₹</div>
              </section>

              <section className="quick-actions">
                <div className="section-title">
                  <h2>Quick Actions</h2>
                  <p>Access your banking services</p>
                </div>

                <div className="action-grid">
                  <button
                    className="action-card"
                    onClick={() => {
                      setPaymentMode("Deposit");
                      navigateTo("Payments");
                    }}
                  >
                    <span className="action-icon">↓</span>
                    <strong>Deposit</strong>
                    <small>Add money to an account</small>
                  </button>

                  <button
                    className="action-card"
                    onClick={() => {
                      setPaymentMode("Withdraw");
                      navigateTo("Payments");
                    }}
                  >
                    <span className="action-icon">↑</span>
                    <strong>Withdraw</strong>
                    <small>Withdraw from an account</small>
                  </button>

                  <button
                    className="action-card"
                    onClick={() => navigateTo("Transfer")}
                  >
                    <span className="action-icon">⇄</span>
                    <strong>Transfer</strong>
                    <small>Move money between accounts</small>
                  </button>

                  <button
                    className="action-card"
                    onClick={() => navigateTo("Transactions")}
                  >
                    <span className="action-icon">▤</span>
                    <strong>History</strong>
                    <small>View transaction records</small>
                  </button>
                </div>
              </section>

              <section className="accounts-section">
                <div className="section-heading">
                  <div>
                    <h2>My Accounts</h2>
                    <p>Your registered LedgerLine accounts</p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={createAccount}
                    disabled={accountLoading}
                  >
                    {accountLoading
                      ? "Please wait..."
                      : "+ Create Account"}
                  </button>
                </div>

                {accountLoading ? (
                  <p className="empty-message">
                    Loading accounts...
                  </p>
                ) : accounts.length === 0 ? (
                  <p className="empty-message">
                    No accounts available. Create an account to begin.
                  </p>
                ) : (
                  <div className="accounts-grid">
                    {accounts.map((account, index) => (
                      <article
                        className="account-card"
                        key={account.accountNumber}
                      >
                        <div className="account-card-top">
                          <span className="account-icon">▣</span>
                          <span className="account-status">Active</span>
                        </div>

                        <h3>Account {index + 1}</h3>

                        <p className="account-label">
                          ACCOUNT NUMBER
                        </p>

                        <strong className="account-number">
                          {account.accountNumber}
                        </strong>

                        <div className="account-divider"></div>

                        <p className="account-label">
                          AVAILABLE BALANCE
                        </p>

                        <h2>
                          {account.currency}{" "}
                          {formatMoney(account.balance)}
                        </h2>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
                    {/* ACCOUNTS */}
          {activePage === "Accounts" && (
            <section className="accounts-section">
              <div className="section-heading">
                <div>
                  <h2>Account Management</h2>
                  <p>
                    View all accounts linked to your profile.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={createAccount}
                  disabled={accountLoading}
                >
                  + Create Account
                </button>
              </div>

              {accounts.length === 0 ? (
                <p className="empty-message">
                  No accounts available.
                </p>
              ) : (
                <div className="accounts-grid">
                  {accounts.map((account, index) => (
                    <article
                      className="account-card"
                      key={account.accountNumber}
                    >
                      <h3>Account {index + 1}</h3>

                      <p className="account-label">
                        ACCOUNT NUMBER
                      </p>

                      <strong className="account-number">
                        {account.accountNumber}
                      </strong>

                      <div className="account-divider"></div>

                      <p className="account-label">
                        AVAILABLE BALANCE
                      </p>

                      <h2>
                        {account.currency}{" "}
                        {formatMoney(account.balance)}
                      </h2>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* PAYMENTS */}
          {activePage === "Payments" && (
            <section className="accounts-section">
              <h2>Payments</h2>

              <p className="profile-description">
                Deposit or withdraw money from your LedgerLine accounts.
              </p>

              <div className="payment-form-card">
                <div className="payment-tabs">
                  <button
                    type="button"
                    className={`payment-tab ${
                      paymentMode === "Deposit" ? "selected" : ""
                    }`}
                    onClick={() => {
                      setPaymentMode("Deposit");
                      setPaymentAmount("");
                      setMessage("");
                    }}
                  >
                    Deposit
                  </button>

                  <button
                    type="button"
                    className={`payment-tab ${
                      paymentMode === "Withdraw" ? "selected" : ""
                    }`}
                    onClick={() => {
                      setPaymentMode("Withdraw");
                      setPaymentAmount("");
                      setMessage("");
                    }}
                  >
                    Withdraw
                  </button>
                </div>

                <h3>
                  {paymentMode === "Deposit"
                    ? "Deposit Money"
                    : "Withdraw Money"}
                </h3>

                <p className="profile-description">
                  {paymentMode === "Deposit"
                    ? "Add money to your selected account."
                    : "Withdraw money from your selected account. Withdrawals cannot exceed your available balance."}
                </p>

                <form onSubmit={handlePayment}>
                  <label htmlFor="paymentAccount">
                    Select Account
                  </label>

                  <select
                    id="paymentAccount"
                    value={selectedAccount}
                    onChange={(e) =>
                      setSelectedAccount(e.target.value)
                    }
                    required
                  >
                    <option value="">Choose an account</option>

                    {accounts.map((account) => (
                      <option
                        key={account.accountNumber}
                        value={account.accountNumber}
                      >
                        {account.accountNumber} — {account.currency}{" "}
                        {formatMoney(account.balance)}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="paymentAmount">
                    {paymentMode} Amount (₹)
                  </label>

                  <input
                    id="paymentAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(e.target.value)
                    }
                    required
                  />

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={paymentLoading || accounts.length === 0}
                  >
                    {paymentLoading
                      ? "Processing..."
                      : paymentMode === "Deposit"
                        ? "Deposit Money"
                        : "Withdraw Money"}
                  </button>
                </form>

                {accounts.length === 0 && (
                  <p className="empty-message">
                    Create an account before making a payment.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* TRANSFER */}
          {activePage === "Transfer" && (
            <section className="accounts-section">
              <h2>Transfer Money</h2>

              <p className="profile-description">
                Transfer money between LedgerLine accounts.
              </p>

              <div className="payment-form-card">
                <h3>Transfer Details</h3>

                <form onSubmit={handleTransfer}>
                  <label htmlFor="fromAccount">
                    From Account
                  </label>

                  <select
                    id="fromAccount"
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    required
                  >
                    <option value="">Select source account</option>

                    {accounts.map((account) => (
                      <option
                        key={account.accountNumber}
                        value={account.accountNumber}
                      >
                        {account.accountNumber} — ₹
                        {formatMoney(account.balance)}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="toAccount">
                    Destination Account Number
                  </label>

                  <input
                    id="toAccount"
                    type="text"
                    placeholder="Enter recipient account number"
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    required
                  />

                  <label htmlFor="transferAmount">
                    Transfer Amount (₹)
                  </label>

                  <input
                    id="transferAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    value={transferAmount}
                    onChange={(e) =>
                      setTransferAmount(e.target.value)
                    }
                    required
                  />

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={transferLoading || accounts.length === 0}
                  >
                    {transferLoading
                      ? "Processing Transfer..."
                      : "Transfer Money"}
                  </button>
                </form>

                <p className="profile-description">
                  Please verify the destination account number before submitting.
                </p>
              </div>
            </section>
          )}

          {/* TRANSACTION HISTORY */}
          {activePage === "Transactions" && (
            <section className="accounts-section">
              <div className="section-heading">
                <div>
                  <h2>Transaction History</h2>
                  <p>
                    View all deposits, withdrawals and transfers.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => loadTransactions()}
                  disabled={historyLoading}
                >
                  {historyLoading ? "Loading..." : "Refresh History"}
                </button>
              </div>

              {historyLoading ? (
                <p className="empty-message">
                  Loading transaction history...
                </p>
              ) : transactions.length === 0 ? (
                <p className="empty-message">
                  No transactions found. Your transactions will appear here after you make a deposit, withdrawal or transfer.
                </p>
              ) : (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      background: "#ffffff",
                      textAlign: "left"
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f3f6fb" }}>
                        {[
                          "Transaction ID",
                          "Account Number",
                          "Type",
                          "Amount",
                          "Date & Time"
                        ].map((heading) => (
                          <th
                            key={heading}
                            style={{
                              padding: "15px 12px",
                              borderBottom: "1px solid #e5eaf1",
                              color: "#52647d",
                              fontSize: "12px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.transactionId}>
                          <td style={tableCellStyle}>
                            #{transaction.transactionId}
                          </td>

                          <td style={tableCellStyle}>
                            {transaction.accountNumber}
                          </td>

                          <td style={tableCellStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "5px 10px",
                                borderRadius: "15px",
                                background:
                                  transaction.type === "DEPOSIT"
                                    ? "#e8f6ef"
                                    : transaction.type === "WITHDRAWAL"
                                      ? "#fff0ed"
                                      : "#eaf1fb",
                                color:
                                  transaction.type === "DEPOSIT"
                                    ? "#208452"
                                    : transaction.type === "WITHDRAWAL"
                                      ? "#c0392b"
                                      : "#2457a7",
                                fontSize: "11px",
                                fontWeight: "600"
                              }}
                            >
                              {transaction.type}
                            </span>
                          </td>

                          <td style={tableCellStyle}>
                            ₹{formatMoney(transaction.amount)}
                          </td>

                          <td style={tableCellStyle}>
                            {formatDate(transaction.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
                    {/* PROFILE WITH BANK DETAILS AND QR CODE */}
          {activePage === "Profile" && (
            <section className="accounts-section">
              <div className="section-heading">
                <div>
                  <h2>My Profile</h2>
                  <p>View and manage your personal information.</p>
                </div>
              </div>

              {profileLoading ? (
                <p className="empty-message">
                  Loading profile...
                </p>
              ) : profile ? (
                <div className="profile-card">
                  <div className="profile-header">
                    <div className="profile-avatar large">
                      {(profile.fullName || email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h2>{profile.fullName}</h2>
                      <p>{profile.email}</p>
                      <span className="account-status">
                        {profile.role || "ACCOUNT_HOLDER"}
                      </span>
                    </div>
                  </div>

                  <div className="profile-details">
                    <div>
                      <span>Full Name</span>
                      <strong>{profile.fullName || "Not available"}</strong>
                    </div>

                    <div>
                      <span>Email Address</span>
                      <strong>{profile.email || "Not available"}</strong>
                    </div>

                    <div>
                      <span>Account Role</span>
                      <strong>{profile.role || "ACCOUNT_HOLDER"}</strong>
                    </div>

                    <div>
                      <span>Bank Name</span>
                      <strong>LedgerLine Financial</strong>
                    </div>

                    <div>
                      <span>IFSC Code</span>
                      <strong>LEDG0001234</strong>
                    </div>
                  </div>

                  <div className="profile-form-section">
                    <h3>Update Phone Number</h3>

                    <form onSubmit={savePhoneNumber}>
                      <label htmlFor="phoneNumber">
                        Phone Number
                      </label>

                      <input
                        id="phoneNumber"
                        type="tel"
                        maxLength="10"
                        placeholder="Enter 10-digit phone number"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(e.target.value)
                        }
                        required
                      />

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={profileSaving}
                      >
                        {profileSaving
                          ? "Saving..."
                          : "Update Phone Number"}
                      </button>
                    </form>
                  </div>

                  <div className="profile-form-section">
                    <h3>My Bank Account</h3>

                    {accounts.length === 0 ? (
                      <p className="empty-message">
                        No bank account found. Create an account first.
                      </p>
                    ) : (
                      <>
                        <label htmlFor="qrAccount">
                          Select Account
                        </label>

                        <select
                          id="qrAccount"
                          value={qrAccount}
                          onChange={(e) =>
                            setQrAccount(e.target.value)
                          }
                        >
                          {accounts.map((account) => (
                            <option
                              key={account.accountNumber}
                              value={account.accountNumber}
                            >
                              {account.accountNumber}
                            </option>
                          ))}
                        </select>

                        {accounts
                          .filter(
                            (account) =>
                              account.accountNumber === qrAccount
                          )
                          .map((account) => (
                            <div
                              key={account.accountNumber}
                              className="profile-details"
                            >
                              <div>
                                <span>Account Number</span>
                                <strong>
                                  {account.accountNumber}
                                </strong>
                              </div>

                              <div>
                                <span>Account Balance</span>
                                <strong>
                                  {account.currency}{" "}
                                  {formatMoney(account.balance)}
                                </strong>
                              </div>

                              <div>
                                <span>Account Status</span>
                                <strong>Active</strong>
                              </div>
                            </div>
                          ))}

                        <div
                          style={{
                            marginTop: "25px",
                            textAlign: "center",
                            padding: "25px",
                            background: "#f7f9fc",
                            borderRadius: "12px"
                          }}
                        >
                          <h3>QR Code</h3>

                          <p className="profile-description">
                            Scan this QR code to view the selected account number.
                          </p>

                          <div
                            style={{
                              display: "inline-block",
                              padding: "15px",
                              background: "#ffffff",
                              borderRadius: "10px",
                              border: "1px solid #e5eaf1"
                            }}
                          >
                            <QRCodeSVG
                              value={qrAccount || "LedgerLine Account"}
                              size={180}
                              level="H"
                            />
                          </div>

                          <p
                            style={{
                              marginTop: "12px",
                              fontSize: "13px",
                              color: "#52647d"
                            }}
                          >
                            Account: {qrAccount}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="empty-message">
                  Profile information is not available.
                </p>
              )}
            </section>
          )}

          {/* ANALYTICS */}
          {activePage === "Analytics" && (
            <section className="accounts-section">
              <div className="section-heading">
                <div>
                  <h2>Financial Analytics</h2>
                  <p>
                    Understand your account balances and transaction activity.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={async () => {
                    await loadAccounts();
                    await loadTransactions();
                  }}
                >
                  Refresh Analytics
                </button>
              </div>

              {/* CALCULATE TRANSACTION TOTALS */}
              {(() => {
                const deposits = transactions
                  .filter((t) => t.type === "DEPOSIT")
                  .reduce(
                    (sum, t) => sum + Number(t.amount || 0),
                    0
                  );

                const withdrawals = transactions
                  .filter((t) => t.type === "WITHDRAWAL")
                  .reduce(
                    (sum, t) => sum + Number(t.amount || 0),
                    0
                  );

                const totalTransactions = transactions.length;

                const depositCount = transactions.filter(
                  (t) => t.type === "DEPOSIT"
                ).length;

                const withdrawalCount = transactions.filter(
                  (t) => t.type === "WITHDRAWAL"
                ).length;

                const transferCount = transactions.filter(
                  (t) => t.type === "TRANSFER"
                ).length;

                const totalActivity = deposits + withdrawals;
                const depositPercent =
                  totalActivity > 0
                    ? (deposits / totalActivity) * 100
                    : 0;

                const withdrawalPercent =
                  totalActivity > 0
                    ? (withdrawals / totalActivity) * 100
                    : 0;

                const totalAccountBalance = accounts.reduce(
                  (sum, account) =>
                    sum + Number(account.balance || 0),
                  0
                );

                const chartColors = [
                  "#2457a7",
                  "#208452",
                  "#8b5cf6",
                  "#e09b32",
                  "#0d9488",
                  "#d9468d"
                ];

                // MONTHLY TRANSACTION DATA
                const monthlyData = Array.from(
                  { length: 6 },
                  (_, index) => {
                    const date = new Date();
                    date.setDate(1);
                    date.setMonth(date.getMonth() - (5 - index));

                    const month = date.getMonth();
                    const year = date.getFullYear();

                    const monthTransactions = transactions.filter(
                      (t) => {
                        const transactionDate = new Date(t.createdAt);

                        return (
                          !Number.isNaN(transactionDate.getTime()) &&
                          transactionDate.getMonth() === month &&
                          transactionDate.getFullYear() === year
                        );
                      }
                    );

                    const monthDeposits = monthTransactions
                      .filter((t) => t.type === "DEPOSIT")
                      .reduce(
                        (sum, t) => sum + Number(t.amount || 0),
                        0
                      );

                    const monthWithdrawals = monthTransactions
                      .filter((t) => t.type === "WITHDRAWAL")
                      .reduce(
                        (sum, t) => sum + Number(t.amount || 0),
                        0
                      );

                    return {
                      label: date.toLocaleString("en-IN", {
                        month: "short"
                      }),
                      deposits: monthDeposits,
                      withdrawals: monthWithdrawals
                    };
                  }
                );

                const maximumMonthlyValue = Math.max(
                  1,
                  ...monthlyData.flatMap((item) => [
                    item.deposits,
                    item.withdrawals
                  ])
                );

                // ACCOUNT BALANCE DISTRIBUTION
                let currentAngle = 0;

                const accountSegments = accounts.map(
                  (account, index) => {
                    const balance = Number(account.balance || 0);

                    const percentage =
                      totalAccountBalance > 0
                        ? (balance / totalAccountBalance) * 100
                        : 0;

                    const startAngle = currentAngle;
                    currentAngle += percentage * 3.6;

                    return {
                      accountNumber: account.accountNumber,
                      balance,
                      percentage,
                      startAngle,
                      endAngle: currentAngle,
                      color: chartColors[index % chartColors.length]
                    };
                  }
                );

                const balanceGradient =
                  totalAccountBalance > 0
                    ? `conic-gradient(${accountSegments
                        .map(
                          (segment) =>
                            `${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`
                        )
                        .join(", ")})`
                    : "#e9edf3";

                return (
                  <>
                    {/* SUMMARY CARDS */}
                    <div className="analytics-summary-grid">
                      <div className="analytics-card">
                        <span>Total Balance</span>
                        <h2>
                          ₹{formatMoney(totalAccountBalance)}
                        </h2>
                        <small>Across all your accounts</small>
                      </div>

                      <div className="analytics-card">
                        <span>Total Deposits</span>
                        <h2>
                          ₹{formatMoney(deposits)}
                        </h2>
                        <small>{depositCount} deposit records</small>
                      </div>

                      <div className="analytics-card">
                        <span>Total Withdrawals</span>
                        <h2>
                          ₹{formatMoney(withdrawals)}
                        </h2>
                        <small>
                          {withdrawalCount} withdrawal records
                        </small>
                      </div>

                      <div className="analytics-card">
                        <span>Total Transactions</span>
                        <h2>{totalTransactions}</h2>
                        <small>
                          {transferCount} transfer records
                        </small>
                      </div>
                    </div>

                    {/* CIRCULAR CHARTS */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "22px",
                        marginTop: "25px"
                      }}
                    >
                      {/* DEPOSIT VS WITHDRAWAL DONUT */}
                      <div
                        className="analytics-card"
                        style={{ padding: "25px" }}
                      >
                        <h3>Deposit vs Withdrawal</h3>

                        <p className="profile-description">
                          Comparison of your deposit and withdrawal amounts.
                        </p>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexWrap: "wrap",
                            gap: "25px",
                            marginTop: "25px"
                          }}
                        >
                          <div
                            style={{
                              width: "190px",
                              height: "190px",
                              borderRadius: "50%",
                              background:
                                totalActivity > 0
                                  ? `conic-gradient(#208452 0% ${depositPercent}%, #d9534f ${depositPercent}% 100%)`
                                  : "#e9edf3",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "relative"
                            }}
                          >
                            <div
                              style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "50%",
                                background: "#ffffff",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <strong style={{ fontSize: "20px" }}>
                                {totalActivity > 0
                                  ? `${Math.round(depositPercent)}%`
                                  : "0%"}
                              </strong>

                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#718096"
                                }}
                              >
                                Deposits
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "15px"
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "11px",
                                  height: "11px",
                                  borderRadius: "3px",
                                  background: "#208452",
                                  marginRight: "8px"
                                }}
                              ></span>

                              <strong>Deposits</strong>

                              <p style={{ margin: "5px 0 0 20px" }}>
                                ₹{formatMoney(deposits)}
                              </p>

                              <small style={{ marginLeft: "20px" }}>
                                {depositPercent.toFixed(1)}%
                              </small>
                            </div>

                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "11px",
                                  height: "11px",
                                  borderRadius: "3px",
                                  background: "#d9534f",
                                  marginRight: "8px"
                                }}
                              ></span>

                              <strong>Withdrawals</strong>

                              <p style={{ margin: "5px 0 0 20px" }}>
                                ₹{formatMoney(withdrawals)}
                              </p>

                              <small style={{ marginLeft: "20px" }}>
                                {withdrawalPercent.toFixed(1)}%
                              </small>
                            </div>
                          </div>
                        </div>

                        {totalActivity === 0 && (
                          <p className="empty-message">
                            No deposit or withdrawal data available yet.
                          </p>
                        )}
                      </div>

                      {/* ACCOUNT BALANCE DONUT */}
                      <div
                        className="analytics-card"
                        style={{ padding: "25px" }}
                      >
                        <h3>Account Balance Distribution</h3>

                        <p className="profile-description">
                          Share of total balance held in each account.
                        </p>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexWrap: "wrap",
                            gap: "25px",
                            marginTop: "25px"
                          }}
                        >
                          <div
                            style={{
                              width: "190px",
                              height: "190px",
                              borderRadius: "50%",
                              background: balanceGradient,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <div
                              style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "50%",
                                background: "#ffffff",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <strong style={{ fontSize: "18px" }}>
                                ₹{formatMoney(totalAccountBalance)}
                              </strong>

                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#718096"
                                }}
                              >
                                Total Balance
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px"
                            }}
                          >
                            {accountSegments.map((segment) => (
                              <div key={segment.accountNumber}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: "11px",
                                    height: "11px",
                                    borderRadius: "3px",
                                    background: segment.color,
                                    marginRight: "8px"
                                  }}
                                ></span>

                                <strong>
                                  {segment.accountNumber}
                                </strong>

                                <p style={{ margin: "4px 0 0 20px" }}>
                                  ₹{formatMoney(segment.balance)}
                                </p>

                                <small style={{ marginLeft: "20px" }}>
                                  {segment.percentage.toFixed(1)}%
                                </small>
                              </div>
                            ))}
                          </div>
                        </div>

                        {accounts.length === 0 && (
                          <p className="empty-message">
                            No account balance data available.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* MONTHLY TRANSACTION CHART */}
                    <div
                      className="analytics-card"
                      style={{
                        marginTop: "25px",
                        padding: "25px"
                      }}
                    >
                      <h3>Monthly Transaction Overview</h3>

                      <p className="profile-description">
                        Deposit and withdrawal activity over the last six months.
                      </p>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "space-around",
                          gap: "15px",
                          height: "230px",
                          padding: "20px 5px 5px",
                          borderBottom: "1px solid #e5eaf1"
                        }}
                      >
                        {monthlyData.map((item) => (
                          <div
                            key={item.label}
                            style={{
                              flex: 1,
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <div
                              style={{
                                height: "180px",
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "center",
                                gap: "5px",
                                width: "100%"
                              }}
                            >
                              <div
                                title={`Deposits: ₹${formatMoney(item.deposits)}`}
                                style={{
                                  width: "25%",
                                  maxWidth: "35px",
                                  height: `${(item.deposits / maximumMonthlyValue) * 100}%`,
                                  minHeight:
                                    item.deposits > 0 ? "4px" : "0",
                                  background: "#208452",
                                  borderRadius: "5px 5px 0 0"
                                }}
                              ></div>

                              <div
                                title={`Withdrawals: ₹${formatMoney(item.withdrawals)}`}
                                style={{
                                  width: "25%",
                                  maxWidth: "35px",
                                  height: `${(item.withdrawals / maximumMonthlyValue) * 100}%`,
                                  minHeight:
                                    item.withdrawals > 0 ? "4px" : "0",
                                  background: "#d9534f",
                                  borderRadius: "5px 5px 0 0"
                                }}
                              ></div>
                            </div>

                            <strong style={{ fontSize: "12px" }}>
                              {item.label}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "25px",
                          marginTop: "15px",
                          flexWrap: "wrap"
                        }}
                      >
                        <span>
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              background: "#208452",
                              borderRadius: "2px",
                              marginRight: "7px"
                            }}
                          ></span>
                          Deposits
                        </span>

                        <span>
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              background: "#d9534f",
                              borderRadius: "2px",
                              marginRight: "7px"
                            }}
                          ></span>
                          Withdrawals
                        </span>
                      </div>
                    </div>

                    {/* TRANSACTION SUMMARY */}
                    <div
                      className="analytics-card"
                      style={{
                        marginTop: "25px",
                        padding: "25px"
                      }}
                    >
                      <h3>Transaction Summary</h3>

                      <div className="profile-details">
                        <div>
                          <span>Deposit Records</span>
                          <strong>{depositCount}</strong>
                        </div>

                        <div>
                          <span>Withdrawal Records</span>
                          <strong>{withdrawalCount}</strong>
                        </div>

                        <div>
                          <span>Transfer Records</span>
                          <strong>{transferCount}</strong>
                        </div>

                        <div>
                          <span>Total Records</span>
                          <strong>{totalTransactions}</strong>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </section>
          )}

          {/* MESSAGE */}
          {message && (
            <div className="message-box">
              {message}
            </div>
          )}

          <footer className="dashboard-footer">
            <p>
              © 2026 LedgerLine. Secure Money Movement.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

const tableCellStyle = {
  padding: "15px 12px",
  borderBottom: "1px solid #edf0f4",
  color: "#344563",
  fontSize: "12px",
  whiteSpace: "nowrap"
};

export default App;