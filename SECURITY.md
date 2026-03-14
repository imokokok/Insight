# Security Policy

## Overview

This document outlines the security architecture and best practices for the Insight Oracle Data Analytics Platform. The platform leverages Supabase for authentication, database management, and real-time features, with Row Level Security (RLS) as the primary authorization mechanism.

## Table of Contents

- [Authentication](#authentication)
- [Authorization](#authorization)
- [Row Level Security Policies](#row-level-security-policies)
- [Environment Variable Security](#environment-variable-security)
- [API Security](#api-security)
- [Data Protection](#data-protection)
- [Security Best Practices](#security-best-practices)
- [Reporting Security Issues](#reporting-security-issues)

---

## Authentication

### Supabase Auth Integration

The platform uses Supabase Auth as the primary authentication provider, providing secure, production-ready authentication with multiple sign-in methods.

### Email/Password Authentication

```typescript
import { signUp, signIn } from '@/lib/supabase/auth';

const result = await signUp(email, password, displayName);

const result = await signIn(email, password);
```

**Security Features:**
- Passwords are hashed using bcrypt by Supabase
- Email verification is required for new accounts
- Rate limiting on authentication attempts (handled by Supabase)
- Secure password reset flow

### OAuth Providers

The platform supports OAuth authentication with multiple providers:

```typescript
import { signInWithOAuth } from '@/lib/supabase/auth';
import type { Provider } from '@supabase/supabase-js';

await signInWithOAuth('google' as Provider);
await signInWithOAuth('github' as Provider);
```

**Supported OAuth Providers:**
- Google
- GitHub
- Additional providers can be configured in Supabase dashboard

**OAuth Flow:**
1. User initiates OAuth login
2. Redirected to provider's authorization page
3. Provider redirects to `/auth/callback` with authorization code
4. Code exchanged for session tokens
5. Secure HTTP-only cookies set for session management

### Session Management

Sessions are managed securely using HTTP-only cookies:

```typescript
response.cookies.set('sb-access-token', session.access_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: session.expires_in,
  path: '/',
});
```

**Session Security:**
- HTTP-only cookies prevent XSS access
- Secure flag enforced in production (HTTPS only)
- SameSite=Lax prevents CSRF attacks
- Automatic token refresh handled by Supabase client

### Password Reset Flow

```typescript
import { resetPassword, updatePassword } from '@/lib/supabase/auth';

await resetPassword(email);

await updatePassword(newPassword);
```

**Reset Flow:**
1. User requests password reset with email
2. Supabase sends secure reset link (time-limited)
3. User clicks link and is redirected to reset page
4. User enters new password
5. Session is updated with new credentials

### Email Verification

- New user registrations require email verification
- Verification links are time-limited and single-use
- Unverified users have limited access to protected resources

---

## Authorization

### Row Level Security (RLS)

Row Level Security is the primary authorization mechanism, enforced at the database level. This ensures data access control regardless of the client (web, API, direct database connection).

**Key Principles:**
- All tables have RLS enabled
- Policies use `auth.uid()` to identify the current user
- Service role bypasses RLS for administrative operations
- Public data has read-only access policies

### User-Specific Data Access

Users can only access their own data for sensitive tables:

```sql
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);
```

### Public vs Private Data

| Table | Access Level | RLS Policy |
|-------|-------------|------------|
| `user_profiles` | Private | Users own their profile |
| `price_records` | Public Read | Anyone can read; service role writes |
| `user_snapshots` | Mixed | Users own snapshots; public snapshots viewable |
| `user_favorites` | Private | Users own their favorites |
| `price_alerts` | Private | Users own their alerts |
| `alert_events` | Private | Users can view/update own events |

### Service Role for Admin Operations

Administrative operations use the service role key, which bypasses RLS:

```typescript
import { createServerClient } from '@/lib/supabase/server';

const client = createServerClient();
```

**Service Role Usage:**
- Writing price records from oracle data collectors
- Batch operations and data migrations
- System-level cleanup tasks
- OAuth callback handling

**Security Note:** The service role key must never be exposed to the client. It is only used in server-side API routes.

---

## Row Level Security Policies

### user_profiles

Users can only access their own profile data.

```sql
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
```

### price_records

Price data is publicly readable; only service role can write.

```sql
ALTER TABLE public.price_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price records"
    ON public.price_records FOR SELECT
    USING (true);
```

**Note:** Write operations are restricted to service role. No INSERT/UPDATE/DELETE policies exist for authenticated users.

### user_snapshots

Users own their snapshots; public snapshots are viewable by all.

```sql
ALTER TABLE public.user_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
    ON public.user_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Public snapshots are viewable by all"
    ON public.user_snapshots FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can create own snapshots"
    ON public.user_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
    ON public.user_snapshots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
    ON public.user_snapshots FOR DELETE
    USING (auth.uid() = user_id);
```

### user_favorites

Users have full control over their own favorites.

```sql
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
    ON public.user_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
    ON public.user_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
    ON public.user_favorites FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
    ON public.user_favorites FOR DELETE
    USING (auth.uid() = user_id);
```

### price_alerts

Users have full control over their own alerts.

```sql
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
    ON public.price_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
    ON public.price_alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON public.price_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
    ON public.price_alerts FOR DELETE
    USING (auth.uid() = user_id);
```

### alert_events

Users can view and acknowledge their own alert events.

```sql
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alert events"
    ON public.alert_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alert events"
    ON public.alert_events FOR UPDATE
    USING (auth.uid() = user_id);
```

---

## Environment Variable Security

### Required Variables

| Variable | Description | Exposure |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public (client-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Public (client-safe) |

### Sensitive Variables (Server-Only)

| Variable | Description | Exposure |
|----------|-------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | **Server-only** |
| `SUPABASE_URL` | Server-side Supabase URL | Server-only |

### Public Variables (Client-Safe)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application base URL | - |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | - |
| `NEXT_PUBLIC_ENABLE_REALTIME` | Enable real-time features | `true` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable Vercel Analytics | `false` |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | `false` |

### Configuration Validation

```typescript
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`Missing environment variable: ${name}, using fallback`);
    return '';
  }
  return value;
}
```

### Production vs Development

**Production Requirements:**
- All required variables must be set
- `NEXT_PUBLIC_SUPABASE_URL` must use HTTPS
- `SUPABASE_SERVICE_ROLE_KEY` must be securely stored
- Cookie secure flag is enforced

**Development Considerations:**
- Missing variables trigger warnings, not errors
- Fallback values may be used for local development
- HTTP allowed for local development

### Never Commit Secrets

**Best Practices:**
- Use `.env.local` for local development (gitignored)
- Use `.env.example` as a template (committed)
- Store production secrets in secure vault (Vercel, AWS Secrets Manager, etc.)
- Rotate keys periodically
- Never log or expose the service role key

```gitignore
.env
.env.local
.env.*.local
```

---

## API Security

### Authentication Required for User-Specific Endpoints

All user-specific API endpoints validate authentication:

```typescript
export async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}
```

**Protected Endpoints:**
- `/api/alerts/*` - User alerts management
- `/api/favorites/*` - User favorites management
- `/api/snapshots/*` - User snapshots management
- `/api/auth/profile` - User profile operations

### Rate Limiting Considerations

While Supabase provides built-in rate limiting for authentication, consider implementing additional rate limiting for:

- Price data queries
- Alert creation
- Snapshot creation
- API endpoints with heavy computation

**Recommended Implementation:**
- Use Vercel Edge Middleware for rate limiting
- Implement per-user and per-IP limits
- Return appropriate 429 responses with retry headers

### Input Validation

All API endpoints validate input before processing:

```typescript
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, symbol, condition_type, target_value } = body;

  if (!name || !symbol || !condition_type || target_value === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: name, symbol, condition_type, target_value' },
      { status: 400 }
    );
  }

  const validConditionTypes = ['above', 'below', 'change_percent'];
  if (!validConditionTypes.includes(condition_type)) {
    return NextResponse.json(
      { error: `Invalid condition_type. Must be one of: ${validConditionTypes.join(', ')}` },
      { status: 400 }
    );
  }
}
```

### Error Handling Without Exposing Internals

Errors are sanitized before being returned to clients:

```typescript
export function createErrorResponse(options: ApiErrorOptions): NextResponse<ApiErrorResponse> {
  const { code, message, retryable, statusCode } = options;

  logger.error(`API Error - Code: ${code}, Message: ${message}, Retryable: ${retryable}`);

  return NextResponse.json(
    {
      error: {
        code,
        message,
        retryable,
      },
    },
    { status: statusCode }
  );
}
```

**Error Response Structure:**
- Generic error codes (not implementation details)
- User-friendly messages
- Retryable flag for client handling
- Internal errors logged server-side only

---

## Data Protection

### User Data Isolation

User data is isolated through Row Level Security policies. Each user can only access their own data:

- **Profiles**: Only own profile accessible
- **Favorites**: Only own favorites visible
- **Alerts**: Only own alerts configurable
- **Snapshots**: Own snapshots + public snapshots visible
- **Alert Events**: Only own alert events accessible

### Password Hashing

Passwords are hashed by Supabase using bcrypt with appropriate work factors. The application never handles raw passwords directly.

### Secure Data Transmission

**HTTPS Enforcement:**
- Production requires HTTPS for all connections
- Secure cookie flag enforces HTTPS-only transmission
- API endpoints only accessible over HTTPS in production

**WebSocket Security:**
- WebSocket connections use WSS (WebSocket Secure) in production
- Authentication tokens validated on connection
- Real-time subscriptions respect RLS policies

### Data Retention Policies

**Price Records:**
- TTL-based expiration for price records
- Automatic cleanup via `cleanup_expired_price_records()` function
- Expired records automatically deleted

```sql
CREATE OR REPLACE FUNCTION public.cleanup_expired_price_records()
RETURNS void AS $$
BEGIN
    DELETE FROM public.price_records WHERE ttl < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**User Data:**
- User data retained while account is active
- Cascade deletion on user account deletion
- No soft delete implemented (permanent removal)

---

## Security Best Practices

### Use HTTPS in Production

- All production deployments must use HTTPS
- HSTS headers recommended
- Secure cookie flag enforced in production

### Keep Dependencies Updated

Regularly update dependencies to patch security vulnerabilities:

```bash
npm audit
npm audit fix
npm outdated
```

### Regular Security Audits

**Recommended Audit Schedule:**
- Monthly dependency vulnerability scans
- Quarterly code security reviews
- Annual penetration testing
- Continuous monitoring with automated tools

### Monitor for Vulnerabilities

**Monitoring Tools:**
- GitHub Dependabot for dependency alerts
- npm audit in CI/CD pipeline
- Vercel security headers and logging
- Supabase dashboard for authentication anomalies

### Secure WebSocket Connections

```typescript
const wsUrl = process.env.NODE_ENV === 'production'
  ? `wss://${domain}/ws`
  : `ws://localhost:3001/ws`;
```

**WebSocket Security Measures:**
- Use WSS in production
- Validate authentication on connection
- Implement connection rate limiting
- Sanitize all incoming messages

### Protected Route Middleware

The middleware enforces authentication on protected routes:

```typescript
const protectedRoutes = ['/dashboard', '/settings', '/profile'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];

export async function middleware(request: NextRequest) {
  const { session } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
```

### Content Security Policy

Implement CSP headers to prevent XSS attacks:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
```

---

## Reporting Security Issues

### Responsible Disclosure Policy

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO:**
- Report via email to: security@example.com
- Include detailed description of the vulnerability
- Provide steps to reproduce
- Allow reasonable time for response and fix

**DO NOT:**
- Publicly disclose the vulnerability before it's fixed
- Access or modify other users' data
- Perform actions that could harm the system or users

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Initial Response | Within 48 hours |
| Vulnerability Confirmation | Within 5 business days |
| Fix Development | Depends on severity |
| Fix Deployment | Within 7 days of fix completion |
| Public Disclosure | After fix is deployed |

### Scope

**In Scope:**
- Authentication bypasses
- Authorization flaws
- SQL injection
- XSS vulnerabilities
- CSRF vulnerabilities
- Data exposure issues
- API security issues

**Out of Scope:**
- Rate limiting issues (unless severe)
- Social engineering attacks
- Physical security
- Third-party service vulnerabilities (report to respective providers)

### Recognition

We appreciate responsible disclosure and will acknowledge security researchers who help improve our security (with permission).

---

## Security Checklist

### Development

- [ ] Never commit secrets to version control
- [ ] Use environment variables for configuration
- [ ] Validate all user inputs
- [ ] Implement proper error handling
- [ ] Use parameterized queries (handled by Supabase client)

### Pre-Production

- [ ] Enable RLS on all tables
- [ ] Review and test all RLS policies
- [ ] Verify HTTPS enforcement
- [ ] Test authentication flows
- [ ] Run security audit on dependencies

### Production

- [ ] Rotate all API keys and secrets
- [ ] Enable security headers
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging in Supabase

### Ongoing

- [ ] Regular dependency updates
- [ ] Periodic security reviews
- [ ] Monitor authentication logs
- [ ] Review RLS policies for new features
- [ ] Keep Supabase SDK updated

---

## Contact

For security-related inquiries, contact: security@example.com

For general questions, open an issue in the repository.
