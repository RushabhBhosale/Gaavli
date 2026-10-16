# Admin implementation security notes

Passwords use bcrypt cost 12. JWT uses HS256 with an explicit issuer/audience, admin subject and session ID; secrets shorter than 32 characters are rejected. Password hashes never enter a DTO or client component. All browser cookies are httpOnly, SameSite Lax, path `/`, and Secure in production. Remember me uses the explicitly requested 30 days; otherwise one day. Logout revokes the session in MongoDB before clearing the cookie.

Five wrong-password attempts atomically trigger a 15-minute account lock. Expired locks reset the counter on the next attempt; successful login resets it. Unknown identity, wrong password, blocked/pending status and lockout return the same generic message. Unknown users still perform bcrypt comparison. No OTP backend or password recovery backend is implemented.

`src/proxy.ts` performs an initial JWT check for page redirects; the dashboard layout and every protected API check live database session and admin state. Login redirects already authenticated administrators after the same authoritative check. Next.js 16 calls the former middleware convention Proxy. API handlers return JSON authorization errors rather than HTML redirects.

Same-origin mutation checks cover login, logout and all user writes. Do not deploy behind a proxy that changes the application URL origin without aligning trusted host/origin handling. Authenticated API responses are never publicly cached. TanStack Query cache is cleared after logout and is not persisted to browser storage.

Remaining production work includes deployment-level login/IP abuse throttling, audit retention policy, administrator idle-session policy, production monitoring/Sentry integration and end-to-end security verification. No mobile, consent, contact disclosure or offline queue implementation is claimed by this change.
