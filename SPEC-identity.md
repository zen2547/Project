# Spec: identity — V1

Module of [CAPABILITY-MAP.md](./CAPABILITY-MAP.md). Shared stack, structure, style, testing and boundaries live there.

## Objective

Let people become **Members**, sign in, and prove who they are on every request; let the app tell **Admins** apart from **Members**. Ported from `dnc03`, with three known gaps there fixed: `RoleGuard` always returns `true`, register returns the password hash, and `User` has no role.

## Data model

```prisma
enum Role {
  MEMBER
  ADMIN
}

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  displayName  String
  role         Role     @default(MEMBER)
  createdAt    DateTime @default(now())
}
```

(Code keeps the model name `User`; the glossary word for a signed-in person is **Member**.)

## Endpoints

| Method | Path | Access | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | Public | `{ email, password (≥8), displayName (2–40) }` | `201 { id, email, displayName, role }` |
| POST | `/auth/login` | Public | `{ email, password }` | `200 { accessToken }` |
| GET | `/auth/me` | Member | — | `{ id, email, displayName, role, createdAt }` |

JWT payload: `{ sub: userId, role }`, signed with `JWT_SECRET`, lifetime `JWT_EXPIRES_IN`.

## Rules

- Email is trimmed and lower-cased before it is stored or looked up
- Registering always creates a `MEMBER`; there is no way to choose a role through the API
- The first Admin comes from the seed, using `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_DISPLAY_NAME` from `.env`
- `@Role('ADMIN')` on a route or controller makes `RoleGuard` reject anyone whose token role is not `ADMIN` with **403**
- Wrong email and wrong password give the same **401** message (no user enumeration)

## Environment

```
DATABASE_URL, JWT_SECRET (≥32 chars), JWT_EXPIRES_IN (seconds),
ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME
```

`DATABASE_URL` and `JWT_*` are validated at app startup by the Zod env schema; the app refuses to start if any is missing. `ADMIN_*` are only needed by the seed, which validates them itself and stops with a readable error.

## Success Criteria

- [x] Register with a new email returns 201 and a body with **no** `passwordHash` field
- [x] Register with an existing email (any letter case) returns 409
- [x] Register with a 7-character password or a missing `displayName` returns 400
- [x] Login with correct credentials returns `{ accessToken }`; wrong email and wrong password both return 401 with the same message
- [x] `GET /auth/me` without a token → 401; with a valid token → the caller's profile
- [x] A Member calling an `@Role('ADMIN')` route gets 403; the seeded Admin gets through
- [x] After `pnpm prisma db seed`, the Admin from `.env` can log in

## Out of Scope

Refresh tokens, logout/blacklist, password reset, email verification, changing role through the API, rate limiting on login.
