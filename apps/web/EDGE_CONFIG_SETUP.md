# Edge Config Setup Checklist

## ✅ What's Been Done

- [x] Installed `@vercel/edge-config` package in `apps/web`
- [x] Created utility functions in `src/lib/edge-config.ts` for server-side
      usage
- [x] Created React hooks in `src/lib/edge-config-hooks.ts` for client-side
      usage
- [x] Integrated maintenance mode check in `src/middleware.ts`
- [x] Created maintenance page at `src/app/maintenance/page.tsx`
- [x] Added `/maintenance` to excluded paths in middleware
- [x] Updated `.env.example` with Edge Config instructions
- [x] Created comprehensive documentation in `EDGE_CONFIG.md`
- [x] Created example component showing usage

## 🔧 Next Steps to Complete Setup

### Step 1: Pull Environment Variables

```bash
cd apps/web
vercel env pull
```

This will automatically add `EDGE_CONFIG` to your `.env.local`.

### Step 2: Configure Edge Config in Vercel Dashboard

Visit: https://vercel.com/dashboard → Your Project → Settings → Edge Config

Add these items to your Edge Config store:

```json
{
  "maintenanceMode": false,
  "featureFlags": {
    "newBookingFlow": false,
    "betaDashboard": false,
    "analyticsTracking": true
  },
  "supportEmail": "support@tribewishlist.com"
}
```

### Step 3: Test Locally

Start your dev server:

```bash
npm run dev --workspace=apps/web
```

Then test Edge Config is working by visiting `/api/edge-config-test` (you can
create this endpoint to verify).

### Step 4: Deploy to Vercel

The Edge Config connection is automatically injected during deployment. Just
push to GitHub:

```bash
git add .
git commit -m "feat: integrate Vercel Edge Config"
git push origin main
```

## 📁 New Files Created

| File                                     | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| `src/lib/edge-config.ts`                 | Server utilities (async functions)         |
| `src/lib/edge-config-hooks.ts`           | Client utilities (React hooks)             |
| `src/app/maintenance/page.tsx`           | Maintenance page (shown when flag enabled) |
| `src/components/edge-config-example.tsx` | Example usage in components                |
| `EDGE_CONFIG.md`                         | Full documentation                         |

## 📝 Modified Files

| File                | Changes                                           |
| ------------------- | ------------------------------------------------- |
| `src/middleware.ts` | Added maintenance mode check + Edge Config import |
| `.env.example`      | Added EDGE_CONFIG instructions                    |

## 🎯 Use Cases Enabled

### 1. Instant Maintenance Mode

Set `maintenanceMode: true` in Edge Config → all users see maintenance page
instantly (no redeploy).

### 2. Feature Flags

Test new features with specific user segments before full rollout.

### 3. Dynamic Content

Update support emails, CTAs, or other content without code changes.

### 4. A/B Testing

Route users to different variants based on Edge Config values.

### 5. Performance Throttling

Disable heavy features temporarily during traffic spikes.

## 🚀 Quick Example: Enable Maintenance Mode

1. Go to Vercel Dashboard → Edge Config
2. Click "edit" on `maintenanceMode`
3. Change value to `true`
4. Save
5. Instant: All requests now show `/maintenance` page
6. Change back to `false` to restore service

**No deployment needed!** Changes propagate in ~60 seconds.

## 🐛 Troubleshooting

**Q: I don't see Edge Config in Vercel Dashboard**

- Make sure you're on a Pro plan or higher (Edge Config requires Pro)
- Check you're in the right project

**Q: Changes aren't showing**

- Edge Config has a cache, changes take ~60 seconds to propagate
- Try different browser/incognito to clear cache

**Q: Middleware error about Edge Config**

- Edge Config is optional,middleware fails gracefully if unavailable
- Check `.env.local` has `EDGE_CONFIG` value

**Q: How do I test locally?**

- Running `vercel env pull` gives you a local connection string
- Your `.env.local` will have `EDGE_CONFIG` set up

## 📚 Resources

- [Vercel Edge Config Docs](https://vercel.com/docs/storage/edge-config)
- [Full Documentation](./EDGE_CONFIG.md)
- [Example Component](./src/components/edge-config-example.tsx)

## ✨ What's Automatic

- ✅ Maintenance mode redirects (middleware)
- ✅ Feature flags in server components
- ✅ Feature flags in client components
- ✅ Environment variables auto-loaded in production
- ✅ Graceful fallbacks if Edge Config unavailable
- ✅ Zero-latency geographic distribution (Vercel edge locations)

---

**Status**: Ready for deployment! Complete Step 1 above to finish setup.
