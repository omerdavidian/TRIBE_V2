# Vercel Edge Config Integration

## Overview

TRIBE-V2 is integrated with **Vercel Edge Config** for dynamic configuration management without redeployment. This allows you to:

- 🎛️ Toggle features on/off instantly
- 🚨 Enable maintenance mode
- 📊 A/B test features
- ⚙️ Manage configuration values globally

## Setup

### 1. Pull Environment Variables

To get your Edge Config connection string from Vercel:

```bash
cd apps/web
vercel env pull
```

This will add `EDGE_CONFIG` to your `.env.local` file automatically.

### 2. Verify in Vercel Dashboard

Visit your project's Edge Config store:
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Open your project → Settings → Edge Config
- View and manage your configuration items

## Usage

### In Middleware (Server-Side)

Use Edge Config in `src/middleware.ts` for route-level feature flags:

```typescript
import { get } from '@vercel/edge-config'

export async function middleware(request: NextRequest) {
  const maintenanceMode = await get('maintenanceMode')
  if (maintenanceMode === true) {
    return NextResponse.redirect(new URL('/maintenance', request.url), 307)
  }
  return NextResponse.next()
}
```

**Current Implementation**: Maintenance mode check is already enabled. When `maintenanceMode` is set to `true` in Edge Config, all requests (except `/maintenance`) will be redirected to the maintenance page.

### In Server Components

Use the utility functions from `src/lib/edge-config.ts`:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/edge-config'

export default async function Dashboard() {
  const flags = await getFeatureFlags()

  if (flags.newBookingFlow) {
    return <NewBookingFlow />
  }

  return <LegacyBookingFlow />
}
```

### In Client Components

Use React hooks from `src/lib/edge-config-hooks.ts`:

```typescript
'use client'

import { useFeatureFlag } from '@/lib/edge-config-hooks'

export default function BookingButton() {
  const { enabled: newFlowEnabled, loading } = useFeatureFlag('newBookingFlow')

  if (loading) return <div>Loading...</div>

  return (
    <button>
      {newFlowEnabled ? 'New Booking Flow' : 'Standard Booking'}
    </button>
  )
}
```

## Common Patterns

### Feature Flags

Store a `featureFlags` object in Edge Config:

```json
{
  "featureFlags": {
    "newBookingFlow": false,
    "betaDashboard": true,
    "analyticsTracking": true
  }
}
```

Then use:

```typescript
const isNewBookingEnabled = await isFeatureEnabled('newBookingFlow')
```

### Maintenance Mode

Set this in Edge Config to enable maintenance:

```json
{
  "maintenanceMode": true
}
```

**Automatically Handled**: Middleware will redirect all requests to `/maintenance` page when enabled.

### A/B Testing

Store user-segment configuration:

```json
{
  "abTests": {
    "checkoutFlow": "variant-b",
    "profileLayout": "modern"
  }
}
```

### Content Overrides

Manage dynamic content:

```json
{
  "heroText": "Welcome to TRIBE — Your postpartum care village",
  "ctaButtonText": "Create Your Registry",
  "supportEmail": "support@tribewishlist.com"
}
```

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/edge-config.ts` | Server-side utilities for fetching config |
| `src/lib/edge-config-hooks.ts` | React hooks for client-side config |
| `src/middleware.ts` | Middleware with maintenance mode check |
| `src/app/maintenance/page.tsx` | Maintenance page (shown when enabled) |
| `.env.example` | Environment variable template |

## Best Practices

1. **Use Feature Flags for Risky Changes**: Test new features with flags before full rollout
2. **Cache Strategically**: Edge Config values are cached; use appropriate TTLs
3. **Monitor Performance**: Edge Config is geographically distributed—leverage this for low-latency access
4. **Version Your Config**: Keep old feature flags for rollback capability
5. **Document Flags**: Add comments in Edge Config describing what each flag does
6. **Test Offline**: Middleware will fail gracefully if Edge Config is unavailable

## Troubleshooting

### "EDGE_CONFIG not defined"

Make sure you've run `vercel env pull` and `.env.local` contains the connection string.

### Changes not appearing

Edge Config has a cache. Changes may take up to 60 seconds to propagate.

### Middleware not triggering

Check that `maintenanceMode` is `true` (boolean, not string) in Edge Config.

## Deployment

Edge Config is automatically available in production. No additional configuration needed. When deployed to Vercel, the `EDGE_CONFIG` environment variable is injected automatically.

## Related Documentation

- [Vercel Edge Config Docs](https://vercel.com/docs/storage/edge-config)
- [Using Edge Config in Middleware](https://vercel.com/docs/storage/edge-config/using-with-edge-middleware)
- [Edge Config API Reference](https://vercel.com/docs/storage/edge-config/api-reference)
