@AGENTS.md

# otozboze.pl — engineering guidelines

B2B marketplace connecting grain **farmers**, **buyers** and **hauliers** in Poland.
These rules are binding. If a rule blocks you, say so — do not silently work around it.

## Tech stack (do not add alternatives)

| Concern      | Choice                                                       |
| ------------ | ------------------------------------------------------------ |
| Framework    | Next.js 16, App Router, React 19, Turbopack                   |
| Language     | TypeScript, `strict` — `any` is banned, use `unknown` + narrow |
| Styling      | Tailwind CSS v4 (CSS-first config in `globals.css`)           |
| Components   | shadcn/ui (Radix base) — `npx shadcn@latest add <name>`        |
| ORM          | Prisma 7 + `@prisma/adapter-pg` → PostgreSQL 17                |
| Auth         | Auth.js (NextAuth v5) + Prisma adapter — **AWS Cognito in production**, Keycloak locally |
| Validation   | Zod, at every server-side trust boundary                      |
| Local infra  | Docker Compose (Postgres + Keycloak)                          |

Do not introduce a state manager, a data-fetching library, an ORM wrapper, a
component library, or a form library without asking first.

## Next.js 16

Read `node_modules/next/dist/docs/` before writing App Router code — this major
version differs from older training data. In particular: `params`, `searchParams`,
`cookies()`, `headers()` and `draftMode()` are **async** and must be awaited.

## Identity provider

Production is **AWS Cognito**; local development runs Keycloak. Both are OIDC,
so keep the difference in one place:

- The local Keycloak realm is mapped to emit `cognito:groups`, so claim-reading
  code is identical in both environments. Do not read a `roles` claim.
- Provider selection lives in `src/lib/auth/` behind `AUTH_PROVIDER`. Nothing
  outside that directory may import a provider package.
- Cognito's logout is non-standard (`/logout?client_id=…&logout_uri=…`, not
  `end_session_endpoint`) — sign-out must go through the provider abstraction.

**Demo mode.** The MVP demo does not require a login: a dev-only session picks a
seeded user, and the Role Switcher swaps `activeRole` among that user's `roles`.
Keycloak stays wired so the real OIDC path can be exercised on demand, but no
demo flow may depend on it. The shortcut is the *session source*, never the
authorisation check — `requireCapability()` still reads `roles` server-side.

## Server-first architecture

**Server Actions are the default mutation path.** Route handlers under `app/api/`
exist only for Auth.js and third-party webhooks. Never build a REST endpoint just
to call it from your own client component.

- Components are **Server Components** unless they need state, effects, or event
  handlers. `"use client"` goes on the smallest possible leaf, never on a page or
  a layout.
- Data reads happen in Server Components via `src/modules/*/queries/`.
- Mutations happen in Server Actions in `src/modules/*/actions/`, each file
  starting with `"use server"`.
- Never import `src/lib/db/prisma` from a client component or from
  `src/components/`. Prisma is server-only.

### Every Server Action follows this shape

```ts
"use server";

export async function publishOffer(input: unknown) {
  const user = await requireRole("FARMER");        // 1. authenticate + authorise
  const data = publishOfferSchema.parse(input);    // 2. validate with Zod
  const offer = await prisma.grainOffer.update(…); // 3. mutate (transaction if multi-entity)
  revalidatePath("/farmer/offers");                // 4. revalidate affected paths
  return { ok: true, offer };                      // 5. serialisable result
}
```

Skipping step 1 or 2 is a security bug, not a style issue. Authorisation is
**never** inferred from a client-supplied role, a hidden form field, or a header.

## Domain invariants

The trade flow is `GrainOffer → Purchase → TransportJob`. Enforce it:

- Only `ACTIVE` offers can be purchased.
- **A user may not buy their own offer.** Because roles are capability flags, a
  `[FARMER, BUYER]` account can reach both sides of the same trade — reject
  `purchase.buyerId === offer.farmerId` in the action layer. Hauling your own
  load is the opposite case: legitimate and expected, so a carrier who is also
  the seller must be allowed to accept the job.
- **Both sides approve.** Buying reserves; the farmer confirms. Claiming a
  haulage job applies; the buyer approves the carrier. Neither party is ever
  bound by the other acting alone.
- Confirming a purchase and creating its `TransportJob` happen in **one**
  `prisma.$transaction`. A `CONFIRMED` purchase without a transport job is a
  broken state. A `PENDING` one is only a reservation and deliberately has
  none — refusing it deletes the row, because `Purchase.offerId` is unique and
  a lingering record would block every future buyer.
- `Purchase` snapshots `tonnage`, `pricePerTonne` and `totalNet` at purchase
  time. Never render a purchase using the live offer's price.
- Money and tonnage are Prisma `Decimal`. Never do arithmetic on them as JS
  numbers, and never send `Decimal` objects to a client component — convert to
  string at the server boundary.
- State transitions go through the module's action layer, never via an ad-hoc
  `prisma.update` in a page.

### Reviews are earned, not posted

A `Review` may only exist as the by-product of a transaction between its two
parties. This is defended at three levels — keep all three:

1. **Shape** — exactly one of `purchaseId` / `transportJobId` is set, matching
   `scope`. A `CHECK` constraint enforces it, along with `authorId <> subjectId`
   and `rating BETWEEN 1 AND 5`.
2. **Uniqueness** — `@@unique([purchaseId, authorId, subjectId])` and its
   transport twin allow one review per author, per counterparty, per
   transaction. NULLs do not collide in Postgres, so each index guards only its
   own scope.
3. **Eligibility** — `assertCanReview()` in `src/modules/reviews/eligibility.ts`
   resolves the counterparties **from the transaction row itself** and rejects
   anyone who was not a party. Never trust a client-supplied author, subject or
   role; the only thing taken from the request is the transaction id.

`TRADE` pairs the buyer with the offer's farmer. `TRANSPORT` always has the
carrier on one side, facing the buyer or the farmer. Never add a review path
that is not anchored to a transaction row.

### MVP happy path

The demo implements exactly these transitions. No legal, tax or credit
validation yet — keep the path short and the failure modes obvious.

| Actor       | Action        | Offer               | Purchase    | TransportJob           |
| ----------- | ------------- | ------------------- | ----------- | ---------------------- |
| `FARMER`    | Publish offer | `DRAFT` → `ACTIVE`  | —           | —                      |
| `BUYER`     | Reserve       | `ACTIVE` → `RESERVED` | `PENDING` | —                      |
| `FARMER`    | Confirm sale  | `RESERVED` → `SOLD` | `CONFIRMED` | created as `AVAILABLE` |
| `FARMER`    | Refuse        | `RESERVED` → `ACTIVE` | deleted   | —                      |
| `TRANSPORT` | Apply for job | `SOLD`              | `CONFIRMED` | `AVAILABLE` → `ASSIGNED` |
| `BUYER`     | Approve carrier | `SOLD`            | `IN_TRANSPORT` | `ASSIGNED` → `IN_TRANSIT` |
| `BUYER`     | Reject carrier | `SOLD`             | `CONFIRMED` | `ASSIGNED` → `AVAILABLE` |
| `FARMER`    | Withdraw offer | `ACTIVE` → `CANCELLED` | —      | —                      |

Withdrawing is owner-scoped and only leaves `ACTIVE`, so an offer somebody has
already reserved can never be pulled from under them. A paid highlight is not
refunded, on withdrawal or on refusal.

The transport commission is charged when the **buyer approves** the carrier,
never when the carrier applies. A haulier must not pay for a lead the other
side can refuse.

`DELIVERED` and `SETTLED` exist in the enums and appear in seed data, but no
MVP action produces them. Do not build UI for them yet; do not delete them
either.

**Money between the parties is out of scope.** The platform introduces buyer,
farmer and haulier and records what was agreed; payment for the grain and the
freight happens on the parties' own channels. Platform revenue — the highlight
fee, the transport commission and the PRO subscription — is separate and is
tracked in `PlatformCharge`. `Purchase.status = SETTLED` and `settledAt`
therefore mean "the parties told us they are square", never "we moved money".

## Roles are capability flags, not identities

`User.roles` is a **set**: `UserRole[]`, default `[]`. One account may hold
`[FARMER, TRANSPORT, BUYER]` — a farm that sells its crop, hauls with its own
trucks, and buys from neighbours. Never write code that assumes a user "is a"
farmer; ask whether they *can* do the thing.

- `roles` — what the user is entitled to. Synced from the IdP on every sign-in
  (Cognito `cognito:groups`; local Keycloak is mapped to emit the same claim).
  **The only authority for authorisation.** Never edited directly in the app.
- `activeRole` — which hat the user is currently wearing. Session/UI state that
  drives navigation and the Role Switcher. It must always be a member of
  `roles`, and it is **never** an authorisation input.

```ts
await requireCapability("TRANSPORT");    // ✅ entitlement check
if (user.activeRole === "TRANSPORT") …   // ❌ never gates a mutation
prisma.user.findMany({ where: { roles: { has: "TRANSPORT" } } }); // GIN-indexed
```

Empty `roles` means "signed in, can browse, can do nothing" — that is a valid
state, not an error. Deny by default.

Each capability's pages live under `src/app/(platform)/<role>/`. A user with
two capabilities sees both sections; the Role Switcher moves between them
without re-authenticating, because the entitlement was already in the session.

`ADMIN` is a platform privilege, not a trading capability — it grants read
access to every entity but never makes someone a counterparty.

The switcher is a real feature for multi-capability users. In development
(`NEXT_PUBLIC_ENABLE_ROLE_SWITCHER`) it may additionally impersonate roles the
user does not hold — that path must be unreachable in production, and it must
change the *session*, never just client state. Any code path where flipping the
UI role changes what the server returns without a session change is a bug.

## Structure

```
src/
  app/(auth)/            sign-in and public pages
  app/(platform)/<role>/ role-scoped pages
  app/api/auth/          Auth.js route handler (only allowed api route)
  modules/<domain>/      actions/ queries/ components/ + schemas.ts
  lib/auth/              session, requireRole, Auth.js config
  lib/db/prisma.ts       Prisma singleton — server only
  components/ui/         shadcn primitives — do not hand-edit
  components/layout/     shared shell, nav, role switcher
```

Cross-module imports go through the module's public surface, not into a
sibling's internals. Modules may not import each other's `actions/`.

## Conventions

- Files/folders: `kebab-case`. Components: `PascalCase`. Functions/vars:
  `camelCase`. DB enums and their members: `SCREAMING_SNAKE_CASE`.
- Prisma models are singular `PascalCase` (`GrainOffer`), fields `camelCase`.
- Server Actions are verbs: `createOffer`, `acceptTransportJob`.
- Zod schemas live in `src/modules/<domain>/schemas.ts` and are named
  `<action>Schema`.
- UI copy is Polish. Code, comments, identifiers, commits are English.
- No default exports except Next.js-required files (`page.tsx`, `layout.tsx`,
  `route.ts`, `error.tsx`, `loading.tsx`).

## Database

- Schema changes: edit `prisma/schema.prisma`, then `npx prisma migrate dev
  --name <change>`. Never `db push` against a database with migrations, and
  never hand-edit an applied migration.
- Run `npx prisma generate` after any schema change; the client is generated to
  `src/generated/prisma/` and is git-ignored.

## Before you say you are done

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Report failures with their output. Do not describe unverified work as working.
