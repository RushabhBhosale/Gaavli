# Next.js Security Requirements

This document remains authoritative for security and privacy behavior. Next.js implementation must keep secrets server-only; never expose secrets through `NEXT_PUBLIC_*` (all such values are public). Mongoose, MongoDB connections, repositories, and provider credentials are server-only. Protected Route Handlers authenticate and authorize on the server and validate input. Admin client role checks do not provide security. Return safe DTOs, use deliberate Mobile CORS, secure cookies for browser-session auth, CSRF protection where applicable, and deliberate caching. Do not publicly cache authenticated or user-specific data. Do not invent a new authentication model.


---

# `docs/SECURITY_PRIVACY.md`

````md
# Gaavli — Security & Privacy Specification

## 1. Purpose

This document defines the security, privacy, data-protection, authentication, authorization, local-storage, notification, logging, and administrative-security rules for Gaavli.

It is a mandatory implementation reference for:

- Mobile application development
- Backend/API development
- Admin application development
- Database design
- Offline storage and synchronization
- Notification integrations
- WhatsApp/SMS integrations
- Photo/file storage
- Monitoring and logging
- AI-assisted development

The goal is not to build an unnecessarily complex security system.

The goal is to protect users and their data while keeping Gaavli simple, lightweight, reliable, and suitable for real village conditions.

---

# 2. AI Coding Agent Instructions

AI coding agents MUST read this document before implementing or modifying:

- Authentication
- OTP
- User profiles
- Roles/permissions
- Contact information
- Location/village information
- Listings
- Service-provider information
- Notifications
- WhatsApp/SMS
- Photos
- Offline storage
- Sync queues
- Admin functionality
- Audit logs
- API endpoints
- Database schemas
- Logging/monitoring
- Account deactivation/deletion

Security-sensitive changes MUST NOT be implemented based only on the immediate user prompt.

The agent MUST also inspect:

- `AGENTS.md`
- Relevant `AGENTS.md`
- `docs/03-api/API_SPEC.md`
- `docs/04-database/DATABASE.md`
- `docs/OFFLINE_SYNC.md`
- `PROJECT_REQUIREMENTS.md`

---

# 3. Security Principles

Gaavli follows these principles:

1. Collect the minimum data required.
2. Store the minimum data required.
3. Expose the minimum data required.
4. Server is authoritative for security decisions.
5. Authentication and authorization are separate concerns.
6. UI visibility is never authorization.
7. Never trust client-provided roles or permissions.
8. Never trust client-provided ownership.
9. Never trust client-provided village authorization.
10. Never trust client-provided prices, status, or business state.
11. Never expose sensitive data unnecessarily.
12. Do not store secrets in mobile source code.
13. Do not store authentication tokens in ordinary application storage.
14. Do not log sensitive information.
15. Offline data must be treated as potentially exposed.
16. Registration does not automatically mean marketing consent.
17. GPS/location data must be minimized.
18. Self-declared information must not be presented as verified.
19. Admin actions must be auditable.
20. Security controls must remain simple enough to maintain correctly.

---

# 4. Security Philosophy

Gaavli is a community platform, not a banking, healthcare, or financial transaction platform.

Gaavli does NOT control:

- Payments
- Financial transactions
- Delivery
- Negotiation
- In-app chat
- Escrow
- Order fulfillment

Therefore the system should not introduce unnecessary financial or transactional security infrastructure.

However, Gaavli still handles:

- Mobile numbers
- User identities
- Contact information
- Village associations
- Listings
- Service-provider information
- Photos
- Notification preferences
- Consent records
- Administrative actions
- Device/session information

These must be protected appropriately.

---

# 5. Data Classification

All data must be classified before deciding where and how it is stored.

## 5.1 Public Data

Examples:

- Active marketplace listing
- Product category
- Product name
- Approximate village/area
- Public service category
- Publicly shared service description
- Public listing photo

Public data may be visible to guest users where permitted by product requirements.

Do not expose additional private information merely because a listing is public.

---

## 5.2 User-Restricted Data

Examples:

- User profile
- Seller details
- Service-provider contact information
- User-specific interests
- User notification preferences

Only the appropriate authenticated user, authorized recipient, or authorized administrator may access this information.

---

## 5.3 Sensitive Data

Examples:

- Mobile number
- Authentication/session information
- OTP-related data
- Exact location, if collected
- Device identifiers
- Notification tokens
- Consent records
- Administrative/security records
- Audit records
- Internal provider identifiers

Sensitive data must not be exposed through public APIs.

---

## 5.4 Security Secrets

Examples:

- API secrets
- Database credentials
- JWT signing secrets
- Encryption keys
- R2/S3 credentials
- SMS provider credentials
- WhatsApp provider credentials
- Sentry/private integration credentials

Secrets MUST NOT:

- Be committed to Git
- Be included in mobile bundles
- Be included in source code
- Be returned through APIs
- Be written to ordinary logs
- Be placed in client-side environment variables unless genuinely public

---

# 6. Data Minimization

Gaavli must collect only information required for a specific feature.

Before adding a new field, answer:

1. Why is this field required?
2. Which feature needs it?
3. Who needs to access it?
4. Can the feature work without it?
5. Can a less sensitive value be used?
6. How long does it need to be retained?

If there is no clear answer, do not collect the field.

---

# 7. User Data

Potential user data includes:

- User ID
- Mobile number
- Name
- Preferred language
- Village association
- Roles/capabilities
- Listings
- Service-provider information
- Notification preferences
- Consent
- Device/session information

Do not collect additional profile information simply because it may be useful in the future.

---

# 8. Mobile Number Privacy

Mobile numbers are sensitive user information.

Rules:

- Do not expose mobile numbers in public listing APIs unless explicitly required.
- Do not expose mobile numbers to guest users.
- Do not expose another user's mobile number merely because they created a listing.
- Contact disclosure must follow the approved contact flow.
- Do not include mobile numbers in search indexes.
- Do not include mobile numbers in public URLs.
- Do not log mobile numbers unnecessarily.
- Do not use mobile numbers for marketing without appropriate consent.

Where possible, APIs should return controlled contact actions instead of raw contact information.

Example:

```text
Listing
    ↓
Buyer selects "Interested"
    ↓
Seller is notified
    ↓
Contact is disclosed only according to approved rules
````

---

# 9. Authentication

## 9.1 OTP Authentication

Gaavli uses mobile-number-based OTP authentication unless a later approved requirement changes this.

OTP rules:

* OTP must have limited validity.
* OTP must have a maximum verification-attempt limit.
* OTP resend must have a cooldown.
* OTP requests must be rate-limited.
* Excessive attempts must be throttled.
* OTP must never be returned through API responses.
* OTP must never be logged.
* OTP must never be stored in client-side persistent storage.
* OTP must not be stored in plaintext longer than necessary on the server.
* OTP verification must occur server-side.

---

# 10. OTP Abuse Protection

The backend must protect against:

* OTP flooding
* Brute-force OTP attempts
* Number enumeration
* Automated account creation
* Repeated resend requests
* Provider abuse

Controls may include:

* Per-phone rate limits
* Per-IP rate limits
* Device/session heuristics where appropriate
* Verification attempt limits
* Resend cooldown
* Temporary lockout/throttling
* Provider-level limits

Do not make the security system so aggressive that legitimate villagers on unstable networks are unnecessarily blocked.

---

# 11. Authentication Tokens / Sessions

Authentication/session tokens must:

* Be generated server-side.
* Be unpredictable.
* Have controlled lifetime.
* Be revocable where required.
* Not be logged.
* Not be exposed to other users.
* Be stored securely on mobile.

Mobile applications should use:

`Expo SecureStore`

for authentication secrets/tokens.

Do not store authentication tokens in:

* AsyncStorage
* Plain SQLite
* Zustand persistence
* Logs
* URL parameters

unless an explicitly approved architecture requires it.

---

# 12. Logout

Logout must:

1. Clear authentication credentials from secure storage.
2. Clear sensitive local user state.
3. Stop authenticated API operations.
4. Handle pending offline operations safely.
5. Prevent the previous user from accessing private cached information.

Do not allow the next user of the device to automatically inherit the previous user's private data.

---

# 13. Account Deactivation

Deactivation is different from deletion.

A deactivated account:

* Cannot perform normal authenticated actions.
* Must fail server-side authorization checks.
* Must not be able to create/edit listings.
* Must not be able to submit Interested actions.
* Must not be able to modify services.
* Must not be able to perform admin actions.

Important:

An already authenticated mobile client must NOT remain trusted simply because it previously received a valid token.

Server authorization must reject actions from deactivated users.

---

# 14. Account Deletion

If account deletion is implemented:

* Define exactly what is deleted.
* Define what must be retained for legal/security/audit reasons.
* Remove or anonymize personal information where appropriate.
* Handle owned listings.
* Handle service profiles.
* Handle notification preferences.
* Handle consent records.
* Handle audit references.
* Handle pending offline operations.

Do not implement destructive deletion without defining its data-retention consequences.

---

# 15. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

These must remain separate.

The backend MUST enforce authorization.

The following must NEVER be trusted from the client:

* `role`
* `isAdmin`
* `isCoordinator`
* `isSuperAdmin`
* `userId`
* `ownerId`
* `villageId`
* `permissions`

The backend must derive these from the authenticated session and authoritative database state.

---

# 16. Role Model

Current approved administrative roles:

* `COORDINATOR`
* `SUPER_ADMIN`

Normal users may have capabilities such as:

* Buyer
* Seller
* Service Provider

These are product capabilities, not client-controlled security roles.

---

# 17. Coordinator Authorization

A Coordinator may manage only the villages explicitly assigned to them.

The backend MUST verify:

```text
Authenticated user
        ↓
Coordinator role
        ↓
Requested village
        ↓
Coordinator has authority over village
```

Never rely only on the mobile/admin UI hiding villages.

---

# 18. Super Admin Authorization

Super Admin has broader administrative permissions.

However:

* Super Admin actions must still pass server-side authorization.
* Sensitive actions should be audited.
* Destructive actions should require explicit confirmation.
* Privileged operations should not be exposed through normal user APIs.

---

# 19. Ownership Checks

For user-owned resources:

```text
Authenticated user
        ↓
Resource requested
        ↓
Server checks ownership/permission
        ↓
Allow or reject
```

Example:

A seller must not be able to edit another seller's listing simply by changing:

```text
listingId
```

in the API request.

---

# 20. API Security

All protected APIs must require authentication.

Public APIs must expose only intentionally public data.

Every protected mutation must perform:

1. Authentication
2. Authorization
3. Input validation
4. Business-rule validation
5. Database operation

Do not perform only client-side validation.

---

# 21. Input Validation

All API input must be validated using the approved validation layer, primarily:

`Zod`

Validate:

* Request body
* Query parameters
* Route parameters
* Headers where applicable
* Pagination values
* Sorting values
* Filter values
* IDs
* Enum values
* File metadata

Reject unexpected or malformed input.

---

# 22. MongoDB Security

Never pass arbitrary client objects directly into MongoDB queries.

Avoid patterns such as:

```ts
Model.find(req.body)
```

or:

```ts
Model.updateOne({ _id: req.body.id }, req.body)
```

Instead:

* Validate input
* Whitelist fields
* Construct database filters explicitly
* Construct update objects explicitly

This prevents unintended query/update behavior.

---

# 23. Object ID / Resource Enumeration

Do not assume that knowing an ID means a resource is accessible.

Example:

```text
GET /listings/ABC123
```

must still verify whether the requester is allowed to see the resource.

Never rely on obscure IDs as a security mechanism.

---

# 24. API Error Messages

API errors must be useful without exposing internal information.

Do not expose:

* Database connection strings
* Stack traces
* Internal filesystem paths
* Provider secrets
* MongoDB query details
* Internal infrastructure details
* Authentication secrets

Use stable application error codes.

Example:

```json
{
  "code": "LISTING_NOT_FOUND",
  "message": "Listing not found."
}
```

Do not return raw exception messages to clients.

---

# 25. Idempotency Security

Offline operations may be retried.

Mutating APIs that support offline synchronization must support idempotency where defined in:

`docs/OFFLINE_SYNC.md`

Use a stable:

```text
operationId
```

and/or:

```text
Idempotency-Key
```

as defined by `docs/03-api/API_SPEC.md`.

The same operation must not accidentally create duplicate records or duplicate side effects.

---

# 26. Replay Protection

The backend must safely handle:

* Repeated requests
* Retried requests
* Delayed offline requests
* Duplicate API calls
* Old client requests

Where business state has changed, the server must revalidate the current state.

Example:

```text
Mobile believes listing = ACTIVE

Server listing = SOLD_OUT

Mobile sends old edit request

Server must NOT blindly restore ACTIVE state.
```

---

# 27. Offline Storage Security

Offline data must be treated as potentially exposed.

A phone may be:

* Lost
* Stolen
* Shared with family members
* Repaired by a third party
* Used by another person

Therefore:

* Store only required offline data.
* Do not replicate the complete server database.
* Avoid storing sensitive data locally.
* Store authentication secrets in SecureStore.
* Avoid storing unnecessary contact information.
* Clear sensitive data on logout where appropriate.

Refer to:

`docs/OFFLINE_SYNC.md`

---

# 28. Local SQLite Rules

SQLite may contain:

* Cached listings
* Cached categories
* Cached villages
* Cached services
* User drafts
* Sync queue
* Non-sensitive application state

Do not store:

* OTP
* API secrets
* Passwords
* Long-lived authentication secrets
* Provider credentials

unless explicitly approved.

---

# 29. Offline Drafts

User-entered drafts are important because villagers may lose network connectivity.

Drafts must:

* Persist locally.
* Survive temporary network loss.
* Survive app restart where applicable.
* Not silently disappear.
* Be cleared safely when no longer needed.

However, drafts may contain personal information.

Therefore:

* Minimize stored draft data.
* Clear drafts appropriately after successful submission.
* Protect drafts from unnecessary exposure.

---

# 30. Offline Photos

Photos may remain temporarily on the device before upload.

Rules:

* Use application-controlled local storage where possible.
* Do not assume a photo has been uploaded until the server confirms it.
* Keep local photo references until upload success.
* Remove temporary copies after successful upload according to retention rules.
* Do not expose local photo paths through logs or APIs.

---

# 31. Location Privacy

Location information is sensitive.

Gaavli should collect location only when it provides clear product value.

For village proximity:

```text
GPS
 ↓
Candidate suggestion
 ↓
Manual/administrative confirmation
 ↓
Authoritative village relationship
```

GPS must NOT automatically expose a user's exact location to other users.

---

# 32. Exact Location

If GPS is used:

* Do not store exact coordinates unless required.
* Do not expose exact coordinates publicly.
* Do not expose a user's live location to other users.
* Do not use exact location as a public listing field unless explicitly approved.
* Prefer approximate village/area information.

If exact coordinates are temporarily required for a calculation, avoid persisting them unless there is a documented reason.

---

# 33. Village Information

Village information may be considered public/low sensitivity when it refers to a general village association.

However:

```text
Village ≠ Exact Location
```

Do not expose precise user location simply because the user belongs to a particular village.

---

# 34. Search Privacy

Search indexes must not contain unnecessary private fields.

MongoDB Atlas Search should generally index public/searchable information such as:

* Listing item name
* Category
* Description
* Village
* Service profession
* Public keywords

Do not index:

* OTP
* Authentication tokens
* Secrets
* Private contact information
* Internal security fields

unless explicitly required and approved.

---

# 35. Listing Privacy

A public listing may expose:

* Product/service name
* Category
* General location
* Quantity/unit
* Optional rate
* Public photo
* Availability

It must not automatically expose:

* Private user information
* Exact home address
* Exact GPS coordinates
* Private mobile number
* Internal user IDs
* Administrative metadata

---

# 36. Contact Privacy

Gaavli is a connector.

It should not unnecessarily expose contact information.

Preferred flow:

```text
Buyer
 ↓
Interested
 ↓
Seller notification
 ↓
Approved contact mechanism
```

Do not expose a seller's phone number to every user browsing their listings unless that behavior is explicitly approved.

---

# 37. Service Directory Privacy

Service providers may voluntarily publish:

* Profession
* Service description
* Village/area
* Public contact mechanism

However:

* Self-declared does not mean verified.
* Private information must remain private.
* Exact home address should not be required.
* Sensitive professional information should not be collected unless necessary.

---

# 38. Medical / Professional Disclaimer

If a user lists a medical profession or service:

* The platform must not falsely imply professional verification.
* Do not claim qualification unless verified through an approved process.
* The UI should clearly distinguish self-declared information from verified information.

Gaavli is not responsible for independently validating professional qualifications unless a separate verification system is explicitly implemented.

---

# 39. Notification Privacy

Notifications may appear on a user's lock screen.

Therefore notification content must not unnecessarily expose sensitive information.

Avoid:

```text
"Your buyer Rajesh Kumar requested your phone number."
```

Prefer:

```text
"You have a new Gaavli request."
```

Where appropriate, allow the user to open the app for details.

---

# 40. Push Notification Tokens

Push notification tokens are sensitive technical identifiers.

Rules:

* Store only when needed.
* Associate with the appropriate authenticated user/device.
* Do not expose to other users.
* Do not log unnecessarily.
* Remove invalid/stale tokens where appropriate.

---

# 41. WhatsApp / SMS Privacy

External providers may process phone numbers and message content.

Before integrating a provider:

* Confirm what data is sent.
* Minimize transmitted data.
* Use approved provider credentials.
* Do not send unnecessary personal information.
* Do not send sensitive information through notification messages unless explicitly required.
* Record consent where required.
* Support opt-out mechanisms.

---

# 42. Consent

Consent must be explicit where required.

Important distinction:

```text
Account Registration
        ≠
Marketing Consent
```

A user registering with a mobile number does not automatically mean they have agreed to promotional WhatsApp/SMS communication.

Store consent records with enough information to establish:

* User
* Channel
* Purpose
* Status
* Timestamp
* Relevant consent/version information where applicable

---

# 43. Notification Opt-Out

Users must be able to withdraw applicable notification/marketing consent.

Where WhatsApp/SMS provider rules require STOP/opt-out handling:

* Process the opt-out.
* Persist the updated preference.
* Prevent subsequent applicable messages.
* Keep the necessary audit/consent record.

Do not treat an opt-out as temporary unless the product explicitly defines it that way.

---

# 44. Registration vs Marketing

The following must remain separate:

```text
User registration
User authentication
Transactional notification consent
Marketing consent
```

Do not automatically subscribe users to marketing communication because they created an account.

---

# 45. Photos and File Storage

Photos must be stored in:

* Cloudflare R2, or
* AWS S3

according to the approved architecture.

Do not store large image binaries directly in MongoDB unless explicitly approved.

File security rules:

* Validate file type.
* Validate file size.
* Generate safe object keys.
* Do not trust the original filename.
* Do not execute uploaded files.
* Do not expose storage credentials to mobile clients.
* Use controlled upload mechanisms.
* Use appropriate access controls.

---

# 46. File Names

Never use user-supplied filenames directly as trusted storage paths.

Bad:

```text
/uploads/${originalFileName}
```

Prefer server-generated identifiers:

```text
listings/{listingId}/{generatedFileId}.jpg
```

---

# 47. Image Upload Validation

Validate:

* MIME type
* File extension where applicable
* File size
* Image dimensions where required

Do not rely solely on the filename extension.

Reject obviously invalid files.

---

# 48. Admin Security

Admin functionality is security-sensitive.

Rules:

* Admin APIs must be protected independently of UI visibility.
* Coordinator permissions must be server-enforced.
* Super Admin permissions must be server-enforced.
* Admin actions must be auditable.
* Destructive actions require explicit confirmation.
* Sensitive operations should display sufficient context before confirmation.
* Admin pages must not directly access MongoDB.
* Admin must communicate through the backend API.

---

# 49. Destructive Admin Actions

Examples:

* Delete user
* Deactivate user
* Delete listing
* Change coordinator assignment
* Change village mapping
* Modify notification configuration
* Change platform settings

For destructive/sensitive actions:

1. Show what will change.
2. Require explicit confirmation.
3. Verify authorization on the server.
4. Perform the action.
5. Record an audit event where appropriate.

---

# 50. Audit Logging

Audit logs should record security-sensitive administrative actions.

Examples:

* User deactivation
* User reactivation
* Listing administrative removal
* Village mapping change
* Coordinator assignment
* Permission changes
* Platform configuration changes
* Notification configuration changes

Audit records should include, where appropriate:

* Actor ID
* Action
* Target entity
* Timestamp
* Result
* Relevant reason/context

Do not store unnecessary sensitive payloads.

---

# 51. Audit Logs Must Be Trusted

Audit records must be generated server-side.

Never trust the client to tell the server:

```text
performedBy = "admin123"
```

The backend must derive the actor from the authenticated session.

---

# 52. Logging Rules

Application logs are useful for debugging but can become a privacy risk.

Never log:

* OTPs
* Passwords
* Authentication tokens
* Session secrets
* API keys
* Database credentials
* Provider credentials

Avoid logging:

* Full mobile numbers
* Full personal profiles
* Exact GPS coordinates
* Full notification payloads
* Complete API request bodies

Use identifiers or masked values when necessary.

Example:

```text
User 7f91... requested OTP
```

rather than:

```text
OTP for 9876543210 is 123456
```

---

# 53. Error Monitoring

Sentry or similar monitoring may be used.

Before sending errors:

* Remove authentication headers.
* Remove tokens.
* Remove OTP.
* Remove sensitive request bodies.
* Avoid unnecessary personal information.
* Avoid exact location data.

Error monitoring must follow the same privacy principles as application logs.

---

# 54. API Rate Limiting

Rate limiting should be applied to abuse-sensitive endpoints.

Especially:

* OTP request
* OTP verification
* Login/authentication
* Public search
* Listing creation
* Interested
* Notification operations
* File upload
* Admin endpoints

Rate limits should be practical for village users and unstable networks.

Do not create aggressive limits that punish legitimate retries caused by poor connectivity.

---

# 55. Brute Force Protection

Protect against:

* OTP brute force
* Admin authentication brute force
* API abuse
* Repeated resource enumeration
* Automated listing creation
* Notification abuse

Use throttling and rate limiting rather than relying only on frontend controls.

---

# 56. CSRF

For cookie-based authentication, implement appropriate CSRF protection.

If token-based APIs are used without browser cookies for authentication, CSRF exposure is different, but browser/admin security must still be evaluated.

Do not assume CSRF is irrelevant without understanding the chosen authentication mechanism.

---

# 57. CORS

Configure CORS explicitly.

Do not use unrestricted:

```text
Access-Control-Allow-Origin: *
```

for authenticated/admin APIs unless there is a documented reason.

Production origins must be explicitly configured.

---

# 58. Transport Security

Production communication must use HTTPS/TLS.

Do not send:

* OTP
* Authentication tokens
* Personal information
* API credentials

over plaintext HTTP.

Development exceptions must never accidentally reach production.

---

# 59. Environment Variables and Secrets

Environment variables may contain secrets.

Rules:

* Keep secrets outside Git.
* Provide `.env.example` with placeholders only.
* Never commit `.env`.
* Never include server secrets in mobile builds.
* Use deployment/platform secret storage.
* Rotate compromised secrets.

Example:

```text
MONGODB_URI=...
JWT_SECRET=...
SMS_PROVIDER_KEY=...
WHATSAPP_PROVIDER_KEY=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
```

These belong only in secure server/deployment configuration.

---

# 60. Client Environment Variables

Mobile applications are distributed to users.

Therefore:

> Anything embedded in the mobile application should be considered discoverable.

Never place a true secret in:

```text
EXPO_PUBLIC_*
```

or equivalent client-exposed configuration.

Client configuration may contain:

* Public API base URL
* Public application identifiers
* Non-secret feature flags

It must not contain:

* Database credentials
* Signing secrets
* Provider secrets
* Storage secret keys
* Admin credentials

---

# 61. Database Security

MongoDB Atlas must use appropriate:

* Authentication
* Network controls
* Least-privilege database users
* Encryption
* Backup configuration
* Access monitoring

Application users must never connect directly to MongoDB.

Architecture:

```text
Mobile
  ↓
Next.js REST API
  ↓
MongoDB
```

not:

```text
Mobile
  ↓
MongoDB
```

---

# 62. Database Access Control

Use separate credentials/permissions where practical for:

* Application runtime
* Development
* Testing
* Administrative operations

Do not use unrestricted database credentials unnecessarily.

---

# 63. Database Backups

Production data must have an appropriate backup/recovery strategy.

Verify:

* Backup availability
* Retention
* Recovery procedure
* Restore testing where practical

A backup that has never been restored/tested should not be assumed to be reliable.

---

# 64. Data Retention

Do not retain data indefinitely without a reason.

For each significant data category define:

* Why it is stored
* How long it is required
* When it can be deleted/anonymized
* Whether legal/audit retention applies

Examples:

| Data                 | Purpose                 | Retention                                |
| -------------------- | ----------------------- | ---------------------------------------- |
| User profile         | Account                 | While account exists + defined retention |
| Listings             | Marketplace             | According to listing lifecycle           |
| OTP                  | Authentication          | Short-lived                              |
| Notification consent | Compliance/preferences  | As required                              |
| Audit records        | Security/accountability | Defined retention                        |
| Temporary photos     | Upload                  | Until successful processing + cleanup    |

Exact retention periods should be defined before production if legally/business-required.

---

# 65. Data Deletion

Deletion must consider relationships.

Example:

```text
User
 ├── Listings
 ├── Services
 ├── Interests
 ├── Notifications
 ├── Consent
 └── Audit references
```

Do not delete the User document blindly if it leaves:

* Broken ownership
* Broken audit records
* Orphaned records
* Invalid references

Use explicit deletion/anonymization rules.

---

# 66. Referential Integrity

MongoDB does not automatically provide relational foreign-key enforcement.

The application must explicitly handle important relationships.

Before deleting/deactivating an entity, determine:

* What references it?
* What happens to those records?
* What does the user see?
* What happens to offline clients?
* What happens to notifications?
* What happens to audit records?

---

# 67. Deactivated Users and Offline Requests

A user may create an offline operation while active and reconnect later after becoming deactivated.

The server must re-check:

* Authentication
* Account status
* Authorization
* Ownership
* Business state

The request must not succeed simply because it was created while the user was previously active.

---

# 68. Concurrency and Security

Security must consider multiple devices.

Example:

```text
Device A → user edits listing
Device B → user deactivates listing
Device A → sends old edit request later
```

Server must validate current state.

Never assume the mobile client's state is current.

---

# 69. Stale Data

Cached data may be stale.

Security-sensitive decisions must never be based solely on:

* SQLite cache
* Zustand state
* TanStack Query cache
* Old API responses

The server must be authoritative for:

* Permissions
* Ownership
* Account status
* Listing state
* Coordinator scope
* Administrative actions

---

# 70. Client-Side Security

The mobile client must:

* Validate user input for usability.
* Hide inappropriate actions where useful.
* Protect local credentials.
* Avoid exposing secrets.
* Handle authentication expiry.
* Handle deactivated users.
* Avoid storing unnecessary private data.

But:

> Client-side checks are never a substitute for server authorization.

---

# 71. Admin Client Security

The admin UI must:

* Use secure authentication/session handling.
* Never store server secrets.
* Never connect directly to MongoDB.
* Never trust URL parameters for authorization.
* Never assume hidden buttons provide security.
* Handle expired sessions.
* Handle unauthorized API responses.
* Avoid exposing sensitive data in tables unnecessarily.

---

# 72. Dependency Security

Do not add dependencies unnecessarily.

Before adding a security-sensitive dependency:

* Confirm it is actively maintained.
* Review its purpose.
* Check whether the existing stack already provides the capability.
* Avoid duplicate security implementations.

AI coding agents must not add security libraries simply because they are popular without understanding the requirement.

---

# 73. No Custom Cryptography

Do not implement custom cryptographic algorithms.

Use established platform/library primitives.

Examples:

* SecureStore
* Standard TLS
* Well-established token mechanisms
* Provider/platform encryption

Never invent:

```text
myCustomEncrypt()
```

for protecting sensitive information.

---

# 74. Passwords

Gaavli's approved authentication model is OTP-based.

Do not introduce passwords unless explicitly approved.

If passwords are ever introduced:

* Never store plaintext passwords.
* Use an established password hashing algorithm.
* Implement password reset securely.
* Apply brute-force protections.

---

# 75. Third-Party Providers

External providers may include:

* SMS provider
* WhatsApp provider
* Push notification provider
* Cloudflare R2
* AWS S3
* Sentry
* Hosting provider

For each provider:

* Send only required data.
* Store credentials securely.
* Use provider abstraction where practical.
* Handle provider failure gracefully.
* Do not leak provider errors to users.
* Document provider-specific privacy/security implications.

---

# 76. Provider Abstraction

External providers should be accessed through application interfaces where practical.

Example:

```text
NotificationService
       ↓
Provider Interface
       ↓
MSG91 / Gupshup / Other Provider
```

Do not spread provider-specific logic throughout the application.

This also makes provider replacement easier.

---

# 77. AI / LLM Security

Gaavli does not require an LLM at runtime for core MVP functionality.

AI coding agents may be used to develop the application.

However:

* Do not send production secrets to AI coding tools.
* Do not paste real user personal data into development prompts.
* Do not expose production database credentials.
* Do not use real OTPs in AI debugging prompts.
* Do not upload sensitive production logs unnecessarily.
* Use sanitized/test data for development.

AI must assist development without becoming an uncontrolled data-exfiltration path.

---

# 78. AI Coding Agent Security Rules

AI coding agents MUST NOT:

* Disable authentication to make development easier.
* Disable authorization checks.
* Hardcode secrets.
* Add test credentials to production code.
* Commit `.env` files.
* Log OTPs.
* Log tokens.
* Bypass ownership checks.
* Trust client-provided roles.
* Add unrestricted CORS.
* Expose MongoDB directly to clients.
* Disable TLS verification in production.
* Disable rate limiting without justification.
* Mark security-sensitive work complete without verification.

---

# 79. Development Environment

Development should use test data whenever possible.

Do not use real villagers' personal information in:

* Seed files
* Screenshots
* Automated tests
* Git repositories
* Demo accounts
* AI prompts
* Debug logs

Use synthetic data.

---

# 80. Test Data

Example:

```text
Name: Test User
Mobile: Provider-approved test number
Village: Test Village
```

Do not commit real:

* Mobile numbers
* Addresses
* Photos
* Government IDs
* Personal documents
* Provider credentials

---

# 81. Security Testing

Security testing should cover at minimum:

## Authentication

* Invalid OTP
* Expired OTP
* Too many attempts
* Resend abuse
* Session expiry
* Logout
* Deactivated user

## Authorization

* User accessing another user's listing
* User editing another user's listing
* User acting as Coordinator
* Coordinator accessing another village
* Normal user accessing admin APIs
* Coordinator accessing Super Admin functionality

## API

* Invalid input
* Missing authentication
* Invalid IDs
* Enumeration
* Rate limiting
* Duplicate requests
* Replay/stale requests

## Offline

* Duplicate sync
* Stale mutation
* Deactivated user with pending operation
* App restart
* Network failure
* Conflict

## Admin

* Unauthorized destructive action
* Concurrent edits
* Audit logging
* Permission changes

---

# 82. Security Acceptance Tests

The following scenarios are mandatory before MVP release.

### Test 1 — User Ownership

```text
User A creates listing A
User B attempts to edit listing A
Expected: DENIED
```

### Test 2 — Coordinator Scope

```text
Coordinator X manages Village A
Coordinator X attempts to modify Village B
Expected: DENIED
```

### Test 3 — Deactivated User

```text
User is deactivated
Existing session remains on device
User attempts API mutation
Expected: DENIED
```

### Test 4 — OTP Abuse

```text
Repeated OTP requests
Expected: throttled/rejected according to policy
```

### Test 5 — Duplicate Offline Request

```text
Same operation submitted twice
Expected: one business action
```

### Test 6 — Stale Offline Edit

```text
Listing changes on server
Old mobile client sends edit
Expected: server validates current state
```

### Test 7 — Contact Privacy

```text
Guest/user browses listing
Expected: private contact information is not exposed unless approved
```

### Test 8 — Client Role Tampering

```text
Normal user changes client payload:
role = SUPER_ADMIN
Expected: server ignores/rejects client-provided privilege
```

---

# 83. Security Headers

Production web/admin/API services should use appropriate security headers according to the hosting/runtime architecture.

Examples may include:

* Content Security Policy
* X-Content-Type-Options
* Referrer-Policy
* Frame protection
* Strict Transport Security where appropriate

Do not blindly copy a security-header configuration without checking the application's actual requirements.

---

# 84. Web/Admin Security

For the Next.js Admin application:

* Protect authenticated routes.
* Protect API calls.
* Validate all server responses.
* Avoid rendering untrusted HTML.
* Do not use unsafe HTML rendering unnecessarily.
* Sanitize/escape user-generated content.
* Protect browser sessions.
* Configure secure cookies if cookies are used.
* Implement CSRF protections where applicable.

---

# 85. User-Generated Content

Listings and service profiles may contain user-entered text.

Treat all user content as untrusted.

Do not assume:

```text
description
serviceName
itemName
keywords
```

are safe HTML or executable content.

Escape/render safely.

---

# 86. XSS Protection

Do not inject user-generated content directly into HTML.

Avoid unnecessary use of:

```text
dangerouslySetInnerHTML
```

If rich text is introduced later, use an established sanitization strategy.

---

# 87. Open Redirects

Do not blindly redirect users based on arbitrary query parameters.

Validate redirect destinations where redirects are supported.

---

# 88. Deep Links

Mobile deep links must not automatically grant authorization.

A deep link containing:

```text
listingId
```

must still go through normal API authorization.

Never embed secrets or authentication tokens in deep links.

---

# 89. QR Codes / Shared Links

If public listing links or QR codes are introduced:

* Treat them as public.
* Do not encode sensitive data.
* Do not encode authentication tokens.
* Do not assume obscurity provides security.

---

# 90. Data Freshness and Privacy

Cached information may remain on a device after it becomes unavailable or private.

Therefore:

* Cached data must have appropriate expiry/revalidation.
* Sensitive data should have shorter retention.
* Deactivated/private records should be removed or updated when synchronization occurs.
* The UI must not present stale data as guaranteed current.

---

# 91. Privacy-Friendly UX

Security must not make Gaavli unnecessarily difficult for villagers.

Prefer:

* Simple OTP flow
* Clear Marathi messages
* Clear permission explanations
* Simple consent controls
* Understandable privacy messages
* Minimal data entry

Avoid:

* Excessive permissions
* Complex passwords
* Unnecessary forms
* Confusing security warnings
* Unnecessary location collection

---

# 92. Permission Requests

Request device permissions only when required.

Examples:

### Camera

Request only when user chooses to add a photo.

### Location

Request only when a feature genuinely needs location.

### Notifications

Explain why notifications are useful before requesting permission where practical.

Do not request all permissions during first launch without a clear need.

---

# 93. Privacy by Default

Default behavior should favor privacy.

Examples:

* No unnecessary exact location sharing.
* No automatic marketing subscription.
* No public phone number unless explicitly intended.
* No unnecessary profile fields.
* No unnecessary data retention.
* No unnecessary device tracking.

---

# 94. Security vs Product Functionality

When security requirements conflict with convenience:

1. Protect authentication.
2. Protect personal information.
3. Protect authorization.
4. Protect data integrity.
5. Preserve offline reliability.
6. Maintain usability.

Do not solve security problems by silently losing user data.

---

# 95. Security Incident Handling

If a security issue is discovered:

1. Record the issue.
2. Determine affected component/data.
3. Determine severity.
4. Stop further exposure where possible.
5. Rotate compromised credentials if applicable.
6. Fix the vulnerability.
7. Verify the fix.
8. Record the incident/remediation appropriately.
9. Assess whether affected users or stakeholders need notification.

Do not hide security issues by simply deleting logs or changing status.

---

# 96. Severity Classification

Use:

### CRITICAL

Examples:

* Authentication bypass
* Admin privilege escalation
* Database credential exposure
* Mass personal-data exposure

### HIGH

Examples:

* User can access another user's private information
* Coordinator can manage unauthorized villages
* Sensitive tokens exposed

### MEDIUM

Examples:

* Limited information disclosure
* Missing rate limit on non-critical endpoint
* Weak audit coverage

### LOW

Examples:

* Minor logging/privacy issue
* Non-sensitive information exposure

Critical and High issues must not be marked as acceptable technical debt without explicit approval.

---

# 97. Security Change Process

When changing a security-sensitive feature:

1. Read this document.
2. Read relevant requirements.
3. Read architecture.
4. Identify affected APIs.
5. Identify affected database models.
6. Identify offline implications.
7. Identify privacy implications.
8. Implement the smallest safe change.
9. Add/update tests.
10. Run verification.
11. Update documentation.
12. Update `docs/IMPLEMENTATION_STATUS.md`.

---

# 98. Documentation Dependencies

Security-related implementation changes may require updates to:

```text
AGENTS.md
PROJECT_REQUIREMENTS.md
ARCHITECTURE.md
API_SPEC.md
DATABASE.md
OFFLINE_SYNC.md
IMPLEMENTATION_STATUS.md
apps/mobile/AGENTS.md
apps/web/AGENTS.md
```

Do not update every document unnecessarily.

Update only documents whose rules/contracts have actually changed.

---

# 99. Security Definition of Done

A security-sensitive feature is complete only when:

* [ ] Authentication requirements implemented
* [ ] Authorization requirements implemented
* [ ] Input validation implemented
* [ ] Sensitive data exposure reviewed
* [ ] Logging reviewed
* [ ] Offline implications reviewed
* [ ] API behavior verified
* [ ] Relevant automated tests pass
* [ ] Negative/security tests pass
* [ ] No secrets are committed
* [ ] Related documentation updated
* [ ] Implementation status updated

---

# 100. Final Security Rules

The following rules are non-negotiable:

1. Never trust the client for authorization.
2. Never trust client-provided roles.
3. Never trust client-provided ownership.
4. Never expose private contact information unnecessarily.
5. Never expose exact location unnecessarily.
6. Never store OTPs or secrets in mobile storage.
7. Never commit secrets to Git.
8. Never log OTPs or authentication tokens.
9. Never expose MongoDB directly to clients.
10. Never treat cached data as authoritative security state.
11. Never allow offline retry to bypass current authorization.
12. Never allow duplicate offline operations to create duplicate side effects.
13. Never treat registration as marketing consent.
14. Never claim a service provider is verified without actual verification.
15. Never use custom cryptography.
16. Never disable security controls merely to simplify development.
17. Never mark security-sensitive functionality complete without verification.
18. Collect the minimum data necessary.
19. Store the minimum data necessary.
20. Expose the minimum data necessary.

---

# 101. Gaavli Security North Star

Gaavli should be:

**Simple enough for villagers, secure enough to protect them, and transparent enough that the platform never pretends to know or control more than it actually does.**

Security must protect:

```text
User Identity
     ↓
User Privacy
     ↓
User Data
     ↓
User Actions
     ↓
Data Integrity
     ↓
Community Trust
```

At the same time, security must never unnecessarily make the application difficult to use under real village conditions such as:

* Low-cost Android devices
* Shared phones
* Weak mobile networks
* Intermittent connectivity
* App restarts
* Offline operation

The system must protect users **without sacrificing the core offline-first reliability of Gaavli.**

````

### One important architectural point

I would make this the **security authority**, while keeping the implementation-specific rules distributed:

```text
AGENTS.md
   ↓
Global security principles

SECURITY_PRIVACY.md
   ↓
Security + privacy policy/rules

API_SPEC.md
   ↓
Security requirements at API-contract level

DATABASE.md
   ↓
Security-sensitive data model/index/retention rules

OFFLINE_SYNC.md
   ↓
Security implications of local/offline data

apps/web/AGENTS.md
   ↓
Backend implementation rules

apps/mobile/AGENTS.md
   ↓
Mobile implementation rules

IMPLEMENTATION_STATUS.md
   ↓
What is actually implemented and verified
````
