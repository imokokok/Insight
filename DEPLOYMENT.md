# Deployment Guide - Insight Oracle Data Analytics Platform

This guide provides comprehensive instructions for deploying the Insight Oracle Data Analytics Platform to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables Configuration](#environment-variables-configuration)
3. [Supabase Setup](#supabase-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Database Migration](#database-migration)
6. [Production Build](#production-build)
7. [CI/CD Considerations](#cicd-considerations)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have the following:

### Required

- **Node.js**: Version 18.x or higher
- **npm** or **yarn**: Package manager
- **Supabase Account**: For database and authentication
  - Sign up at [supabase.com](https://supabase.com)
- **Vercel Account**: For hosting (recommended)
  - Sign up at [vercel.com](https://vercel.com)
- **GitHub Account**: For repository hosting and CI/CD

### Optional

- **Custom Domain**: For production deployment
- **Vercel Pro Plan**: For advanced features like analytics retention

### Local Development Requirements

```bash
node --version  # Should be 18.x or higher
npm --version   # npm 9.x or higher recommended
```

---

## Environment Variables Configuration

The application uses environment variables for configuration. Create a `.env.local` file locally or configure them in your deployment platform.

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

### Optional Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | Application base URL | - | `https://insight.example.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL for real-time features | - | `wss://ws.example.com` |
| `NEXT_PUBLIC_ENABLE_REALTIME` | Enable real-time features | `true` | `true` / `false` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable Vercel Analytics | `false` | `true` / `false` |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | `false` | `true` / `false` |

### Server-Side Only Variables (for API routes)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) | Server-side operations |
| `SUPABASE_URL` | Alternative to NEXT_PUBLIC_SUPABASE_URL for server | Server-side operations |

### Example `.env.local`

```env
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional - Application Configuration
NEXT_PUBLIC_APP_URL=https://insight.example.com
NEXT_PUBLIC_WS_URL=wss://ws.insight.example.com

# Optional - Feature Flags
NEXT_PUBLIC_ENABLE_REALTIME=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Server-side only (for API routes, cron jobs)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Environment Variable Validation

The application validates environment variables at startup. Missing required variables will:

- **Production**: Throw an error and prevent startup
- **Development**: Show a warning and use fallback values

See [src/lib/config/env.ts](src/lib/config/env.ts) for validation logic.

---

## Supabase Setup

### Step 1: Create a New Supabase Project

1. Navigate to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `insight-oracle-analytics` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose the closest region to your users
4. Click **"Create new project"** and wait for provisioning (~2 minutes)

### Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL**: This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 3: Configure Authentication Providers

1. Go to **Authentication** > **Providers**
2. Enable desired authentication methods:
   - **Email**: Enabled by default
   - **Google**: Configure OAuth with Google Cloud Console
   - **GitHub**: Configure OAuth with GitHub
   - **Other providers**: Discord, Twitter, etc.

3. For OAuth providers, configure the callback URL:
   ```
   https://your-domain.com/auth/callback
   ```

4. Configure email settings (optional):
   - Go to **Authentication** > **Email Templates**
   - Customize confirmation, reset password, and magic link emails

### Step 4: Run Database Migrations

Execute the database schema migration to create required tables.

#### Option A: Using Supabase Dashboard (SQL Editor)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New Query"**
3. Copy the contents of [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
4. Paste and click **"Run"**

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

### Step 5: Verify Row Level Security (RLS)

The migration automatically enables RLS on all tables. Verify:

1. Go to **Table Editor** in Supabase dashboard
2. Select any table (e.g., `user_profiles`)
3. Click **"RLS Policies"** tab
4. Confirm policies are created for SELECT, INSERT, UPDATE, DELETE operations

### Database Tables Created

| Table | Purpose | RLS Enabled |
|-------|---------|-------------|
| `user_profiles` | User preferences and settings | Yes |
| `price_records` | Historical price data from oracles | Yes |
| `user_snapshots` | User-saved price snapshots | Yes |
| `user_favorites` | User favorite configurations | Yes |
| `price_alerts` | Price alert configurations | Yes |
| `alert_events` | Alert trigger event history | Yes |

---

## Vercel Deployment

### Step 1: Prepare Your Repository

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. Ensure `package.json` has correct build scripts:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "eslint"
     }
   }
   ```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** > **"Project"**
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Step 3: Configure Environment Variables

In the Vercel project settings:

1. Go to **Settings** > **Environment Variables**
2. Add all required and optional variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   NEXT_PUBLIC_ENABLE_REALTIME=true
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```

3. Set environment scope:
   - **Production**: All variables
   - **Preview**: All variables (for testing)
   - **Development**: Core variables only

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~2-5 minutes)
3. Vercel will provide a deployment URL (e.g., `https://insight-xyz.vercel.app`)

### Step 5: Configure Custom Domain (Optional)

1. Go to **Settings** > **Domains**
2. Add your custom domain (e.g., `insight.example.com`)
3. Configure DNS records as instructed:
   - **A Record**: Point to Vercel's IP
   - **CNAME Record**: For subdomains
4. Wait for SSL certificate provisioning

### Step 6: Enable Vercel Analytics & Speed Insights

The application already includes Vercel Analytics and Speed Insights:

```tsx
// Already integrated in src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Components are rendered in the layout
<Analytics />
<SpeedInsights />
```

To view analytics:
1. Go to your Vercel project dashboard
2. Click **"Analytics"** tab
3. Enable analytics if not already enabled

---

## Database Migration

### Migration File Overview

The initial migration ([supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)) creates:

#### Tables

1. **user_profiles**: Extends auth.users with preferences
   - Default preferences for oracle, symbol, chain, theme, language
   - Notification settings
   - Auto-created on user signup via trigger

2. **price_records**: Historical price data
   - Stores provider, symbol, chain, price, timestamp, confidence
   - TTL-based expiration for automatic cleanup
   - Optimized indexes for query performance

3. **user_snapshots**: User-saved snapshots
   - Supports public sharing
   - Stores price data and statistics as JSONB

4. **user_favorites**: User favorites
   - Typed configurations (oracle_config, symbol, chain_config)

5. **price_alerts**: Alert configurations
   - Conditions: above, below, change_percent
   - Active/inactive status tracking

6. **alert_events**: Alert trigger history
   - Acknowledgment tracking

#### Functions

- `cleanup_expired_price_records()`: Removes expired price data
- `get_latest_price()`: Retrieves latest price for a symbol
- `get_price_history()`: Retrieves historical prices

#### Views

- `active_alerts_with_prices`: Joins alerts with current prices

### Applying Migrations

#### For New Deployments

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL Editor
# Copy and paste the migration SQL
```

#### For Existing Deployments

If you need to apply additional migrations:

1. Create a new migration file: `supabase/migrations/002_your_migration.sql`
2. Apply using Supabase CLI:
   ```bash
   supabase db push
   ```

### Post-Migration Verification

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public';

-- Verify trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

---

## Production Build

### Build Commands

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

### Production Optimizations

The application includes several production optimizations configured in [next.config.ts](next.config.ts):

```typescript
const nextConfig = {
  // Transpile recharts for better compatibility
  transpilePackages: ['recharts'],
  
  // Remove console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['recharts'],
  },
  
  // Enable Turbopack for faster builds
  turbopack: {},
};
```

### Build Output

The build process:
1. Compiles TypeScript with strict mode
2. Optimizes images and static assets
3. Generates static pages where possible
4. Creates serverless functions for API routes
5. Removes console statements in production

### Build Verification

After a successful build, verify:

```bash
# Check build output
ls -la .next/

# Run production server locally
npm run start

# Test critical paths
curl http://localhost:3000
curl http://localhost:3000/api/oracles
```

### Memory and Performance

For large deployments, consider:

- **Node.js Memory**: Set `NODE_OPTIONS="--max-old-space-size=4096"` for builds
- **Concurrent Builds**: Vercel handles this automatically
- **Edge Functions**: Consider moving frequently accessed API routes to Edge

---

## CI/CD Considerations

### Recommended GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Environment Variable Management

#### GitHub Secrets

Store sensitive variables in GitHub repository secrets:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add repository secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### Vercel Environment Variables

- Use Vercel's environment variable encryption
- Never commit `.env` files to the repository
- Use different values for Production, Preview, and Development

### Pre-Deployment Checks

Before each deployment:

1. **Lint Check**: `npm run lint`
2. **Type Check**: TypeScript compilation (part of build)
3. **Unit Tests**: `npm run test`
4. **Build Test**: `npm run build` succeeds
5. **Security Audit**: `npm audit`

### Deployment Branch Strategy

```
main        -> Production (auto-deploy)
develop     -> Preview (auto-deploy)
feature/*   -> Preview (manual trigger)
```

---

## Post-Deployment Checklist

### Immediate Checks (Within 5 minutes)

- [ ] **Application loads**: Visit the deployed URL
- [ ] **No console errors**: Check browser developer console
- [ ] **Homepage renders**: All components load correctly
- [ ] **Static assets load**: Images, fonts, CSS

### Authentication Verification

- [ ] **Sign up works**: Create a new test account
- [ ] **Email verification**: Check email flow (if enabled)
- [ ] **Sign in works**: Login with test account
- [ ] **OAuth flow**: Test Google/GitHub login (if configured)
- [ ] **Session persistence**: Refresh page, stay logged in
- [ ] **Protected routes**: Access `/settings` requires login
- [ ] **Sign out works**: Logout clears session

### API Endpoints

- [ ] **Oracle list**: `GET /api/oracles` returns data
- [ ] **Oracle data**: `GET /api/oracles/chainlink` returns prices
- [ ] **Alerts API**: CRUD operations work
- [ ] **Favorites API**: CRUD operations work
- [ ] **Snapshots API**: CRUD operations work

### Database Connectivity

- [ ] **User profile created**: Check `user_profiles` table after signup
- [ ] **Data persistence**: Saved favorites appear after refresh
- [ ] **RLS working**: Users can only see their own data

### Real-Time Features

- [ ] **WebSocket connection**: Check connection status indicator
- [ ] **Price updates**: Live price updates appear
- [ ] **Alerts trigger**: Price alerts fire correctly

### Performance

- [ ] **Lighthouse score**: Run Lighthouse audit (target: 90+)
- [ ] **First Contentful Paint**: < 1.8s
- [ ] **Time to Interactive**: < 3.8s
- [ ] **Cumulative Layout Shift**: < 0.1

### Analytics & Monitoring

- [ ] **Vercel Analytics**: Data appears in dashboard
- [ ] **Speed Insights**: Metrics collected
- [ ] **Error tracking**: Set up error monitoring (optional)

### Security

- [ ] **HTTPS enforced**: All traffic uses HTTPS
- [ ] **Headers secure**: Check security headers
- [ ] **RLS policies**: Verify in Supabase dashboard
- [ ] **No exposed secrets**: Check client-side code for leaks

---

## Troubleshooting

### Common Deployment Issues

#### Build Fails with TypeScript Errors

**Symptoms**: Build fails with type errors

**Solutions**:
```bash
# Check TypeScript errors locally
npm run build

# Fix type errors in the reported files
# Ensure all imports are correct
# Check for missing type definitions
```

#### Build Fails with Memory Error

**Symptoms**: JavaScript heap out of memory

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or in package.json
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
}
```

#### Environment Variables Not Loading

**Symptoms**: App crashes, missing Supabase URL

**Solutions**:
1. Verify variables are set in Vercel dashboard
2. Ensure variable names start with `NEXT_PUBLIC_` for client-side access
3. Redeploy after adding new environment variables
4. Check for typos in variable names

### Database Connection Issues

#### Supabase Connection Timeout

**Symptoms**: API requests timeout, database errors

**Solutions**:
1. Check Supabase project status at [status.supabase.com](https://status.supabase.com)
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Check if IP restrictions are enabled
4. Verify project is not paused (free tier pauses after inactivity)

#### RLS Policy Blocking Access

**Symptoms**: "Permission denied" errors, empty results

**Solutions**:
1. Verify RLS policies in Supabase dashboard
2. Check user is authenticated before querying
3. Test policies with Supabase SQL Editor:
   ```sql
   -- Test as authenticated user
   SET request.jwt.claims = '{"sub": "user-uuid"}';
   SELECT * FROM user_profiles;
   ```

### Authentication Issues

#### OAuth Callback Fails

**Symptoms**: Redirect loop, authentication error

**Solutions**:
1. Verify callback URL in OAuth provider settings:
   - Google: `https://your-domain.com/auth/callback`
   - GitHub: `https://your-domain.com/auth/callback`
2. Check Supabase auth settings for correct redirect URLs
3. Verify `NEXT_PUBLIC_APP_URL` is set correctly

#### Session Not Persisting

**Symptoms**: User logged out on refresh

**Solutions**:
1. Check middleware configuration in [src/middleware.ts](src/middleware.ts)
2. Verify cookies are being set correctly
3. Check for cross-origin issues
4. Ensure HTTPS is enabled in production

### Real-Time Feature Issues

#### WebSocket Connection Fails

**Symptoms**: Real-time updates not working, connection errors

**Solutions**:
1. Verify `NEXT_PUBLIC_WS_URL` is correct (if using custom WebSocket)
2. Check Supabase Realtime is enabled in project settings
3. Verify firewall allows WebSocket connections
4. Check browser console for WebSocket errors

#### Real-Time Not Updating

**Symptoms**: Data doesn't update in real-time

**Solutions**:
1. Check `NEXT_PUBLIC_ENABLE_REALTIME` is set to `true`
2. Verify Supabase Realtime is enabled for tables
3. Check subscription status in RealtimeContext

### Performance Issues

#### Slow Page Loads

**Solutions**:
1. Enable Vercel Speed Insights to identify issues
2. Check for large bundle sizes:
   ```bash
   npm run build
   # Check .next/analyze/ for bundle analysis
   ```
3. Optimize images and assets
4. Enable caching for API responses

#### High Memory Usage

**Solutions**:
1. Check for memory leaks in real-time subscriptions
2. Implement proper cleanup in useEffect hooks
3. Consider pagination for large data sets
4. Use virtualization for long lists

### Debugging Tips

#### Enable Debug Logging

```env
# Add to environment variables
NEXT_PUBLIC_DEBUG=true
```

#### Check Vercel Logs

1. Go to Vercel dashboard
2. Select your project
3. Click **"Deployments"**
4. Select a deployment
5. Click **"Functions"** or **"Runtime Logs"**

#### Local Production Testing

```bash
# Build and run locally
npm run build
npm run start

# Test production build
curl http://localhost:3000/api/health
```

### Getting Help

If issues persist:

1. **Check Documentation**: Review this guide and README.md
2. **Search Issues**: Check GitHub issues for similar problems
3. **Vercel Support**: [vercel.com/support](https://vercel.com/support)
4. **Supabase Support**: [supabase.com/support](https://supabase.com/support)
5. **Community**: Stack Overflow with tags `next.js`, `supabase`, `vercel`

---

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
