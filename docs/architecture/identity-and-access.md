# Identity and access

Each `users` row belongs directly to one tenant and carries the user's role and
account status. Email addresses are globally unique, so login can locate the
user and derive the tenant from an email address alone. The only defined role is
`tenant_admin`, and it authorizes the whole tenant.

A new administrator starts as an invited user with a `user_invitations` row.
Only a SHA-256 hash of the random, one-time invitation token is stored. The
invitation has an expiry and is consumed transactionally when the administrator
supplies a display name and password. Possession of the emailed token verifies
the email address.

Passwords are hashed with scrypt and never returned by entity serialization.
Successful activation or login creates an `auth_sessions` row. The browser gets
an opaque, HTTP-only, same-site cookie that is secure by default in production;
the database stores only its hash. A session is rejected immediately when it
expires, is revoked or its user is no longer active.

The invitation request and session token carry a tenant UUID so the server can
establish RLS context before looking up tenant-owned authentication records.
The UUID is routing context, not a credential. Login accepts only an email
address and password; the tenant comes from the matching user.

Accounts are activated through invitations. The authentication HTTP surface is:

- `POST /auth/invitations/accept`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Authenticated operations obtain `tenantId` from the authenticated principal.
Request input does not directly choose the RLS tenant for an authenticated
business operation.
