# Tenant provisioning

`npm run provision:tenant` runs an operator-invoked CLI backed by a standalone
Nest application context. It connects using the dedicated
`lodgekeeper_provisioner` database login configured by
`PROVISIONING_DATABASE_URL`.

## Provisioned records

In one database transaction, the command creates:

- a tenant;
- its initial property;
- an invited user with the `tenant_admin` role; and
- a one-time invitation for that user.

The administrator email is normalized to lowercase. The invitation's random
token is returned for delivery, while only its SHA-256 hash is stored in the
database. An email address that already belongs to a user is rejected.

## Running the command

Configure `PROVISIONING_DATABASE_URL`, `APP_PUBLIC_URL` and the invitation
delivery settings in `.env`, then run:

```sh
npm run provision:tenant -- \
  --tenant-name "Example Lodging" \
  --property-name "Town Lodge" \
  --currency-code INR \
  --timezone Asia/Kolkata \
  --admin-email admin@example.com
```

Every command argument is required. Currency is a three-letter ISO 4217 code,
and timezone is an IANA time-zone name such as `Asia/Kolkata`.

## Invitation delivery

`APP_PUBLIC_URL` supplies the origin for the `/activate` link. The link contains
the tenant ID and invitation token. Account activation submits those values
with the administrator's display name and chosen password to
`POST /auth/invitations/accept`.

`INVITATION_DELIVERY` defaults to `console`, which prints the activation link.
For email delivery, set it to `smtp` and configure `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE` and `SMTP_FROM`. Supply `SMTP_USER` and `SMTP_PASSWORD` together
when the SMTP server requires authentication. `INVITATION_TTL_HOURS` controls
the invitation lifetime and defaults to 48 hours.

The database transaction commits before invitation delivery begins. If the
database operation fails, none of the records are created. If SMTP delivery
fails after the commit, the command exits with an error, retains the provisioned
records and prints the activation link for manual delivery.
