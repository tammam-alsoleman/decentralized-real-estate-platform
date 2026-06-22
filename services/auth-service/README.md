# Auth Service

NestJS gRPC service for account registration, email OTP verification, login OTP, sessions, and legal identity profile reads.

## gRPC

- Default bind URL: `0.0.0.0:50051`
- Configure with `AUTH_GRPC_URL`
- Proto: `packages/proto/auth.proto`

## Database

- `DATABASE_URL` points to PostgreSQL.
- Prisma uses the `auth_schema` schema.
- In Docker, `DATABASE_URL` must use the compose service hostname `postgres`, not `localhost`.

## Docker

From the repository root:

```bash
docker compose build auth-service
docker compose up -d postgres rabbitmq auth-service
docker compose logs -f auth-service
```

The `auth-service` image is built from the repository root so it can include `packages/proto/auth.proto` for gRPC runtime loading. The container listens on `50051`.

`docker compose` does not require `services/auth-service/.env`; compose provides safe local defaults with `${VAR:-default}` substitutions. That `.env` file is optional for manual local runs of the service outside Docker. Local Docker Compose can override the auth database connection with `AUTH_SERVICE_DATABASE_URL`; do not use `localhost` inside the container `DATABASE_URL`, use the compose service hostname such as `postgres`. Production deployments should inject real secrets through environment variables or a secret manager, especially JWT, SMTP/Resend, and legal identity encryption values.

## Email OTP Delivery

Set `EMAIL_OTP_DELIVERY_PROVIDER`:

- `development`: logs OTP delivery details for local development.
- `resend`: sends through Resend using `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- `smtp`: sends through SMTP using `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM_EMAIL`.

## JWT And Sessions

- `AUTH_JWT_ACCESS_TOKEN_SECRET`
- `AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `AUTH_JWT_ISSUER`

Refresh tokens are stored hashed. Logout revokes sessions.

## OTP Response Visibility

- `AUTH_RETURN_OTP_IN_RESPONSE=true` returns OTP plaintext in gRPC responses for local testing.
- `AUTH_RETURN_OTP_IN_RESPONSE=false` should be used in production so OTPs are delivered by email only.

## Profile Updates

- ACTIVE users can update their contact phone number.
- Email change requires an OTP sent to the new email address.
- Completing an email change revokes old sessions and issues a new token pair.
- Legal identity cannot be edited after first submission.
- Frontend clients should show a clear warning before legal identity submission.

## Security Notes

- `RegisterUser` and `RequestLoginOtp` do not issue tokens.
- `CompleteEmailVerification` and `CompleteLoginOtp` issue access and refresh tokens.
- Refresh tokens are stored hashed.
- Logout revokes sessions.
