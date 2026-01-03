## Email Delivery Flow — Sequence Diagram

The diagram below tracks the full email delivery flow: generating a Gmail App Password, storing credentials, transporter setup, controllers that trigger email sends (signup welcome, login alert, forget-password/reset, reset success), rendering EJS templates, and delivery via Gmail SMTP. Preview using VS Code's Markdown preview or the Mermaid Live Editor to verify rendering.

```mermaid
sequenceDiagram
    participant U as User
    participant G as Google Account
    participant APP as App (.env)
    participant CFG as Config (nodemailer)
    participant USR as UserController
    participant AUTH as AuthController
    participant EMAIL as emailService
    participant VIEW as EJS Templates
    participant SMTP as Gmail SMTP
    participant R as Recipient Mailbox

    U->>G: Generate App Password (Google Account → Security → App passwords)
    note right of G: Copy generated app password (16 chars)
    G->>APP: Paste into `.env` as `EMAIL_PASS` (and `EMAIL_USER`)
    APP->>CFG: nodemailer.createTransport({service:'gmail', auth:{user:process.env.EMAIL_USER, pass:process.env.EMAIL_PASS}})
    USR->>EMAIL: Trigger signup welcome email (calls `sendWelcome`)
    AUTH->>EMAIL: Trigger login alert / forget-password / reset-success (respective send methods)
    EMAIL->>VIEW: Render EJS template (welcome/login_alert/forget_password/reset_password)
    EMAIL->>CFG: Build `mailOptions` and call `transporter.sendMail(mailOptions)`
    CFG->>SMTP: Connect & authenticate using app password
    SMTP-->>R: Deliver email
    R-->>U: User receives email

    alt Developer preview
        EMAIL->>VIEW: Provide preview route or dev helper (renders HTML)
        VIEW-->>EMAIL: Returns rendered HTML for developer preview
    end
```

Preview tips:

- Use VS Code: open this file and run "Open Preview" (Ctrl+Shift+V) or install a Mermaid preview extension.
- Or paste the Mermaid block into https://mermaid.live to validate and render.

Notes:

- Ensure `EMAIL_USER` and `EMAIL_PASS` are set in `.env` and not committed to source control.
- For Gmail, enable 2FA and create an App Password for SMTP usage.
