# Stripe Setup Checklist

## ✅ Completed

- [x] Installed `stripe` SDK
- [x] Created `src/lib/stripe.ts` - Client initialization
- [x] Created `src/lib/stripe-types.ts` - TypeScript types
- [x] Created `src/lib/stripe-service.ts` - Core functions
  - [x] `ensureCustomer()` - Create/retrieve customer
  - [x] `createBookingPaymentIntent()` - Create payment intent
  - [x] `createBookingCharge()` - Charge saved card
  - [x] `createProviderConnectedAccount()` - Provider onboarding
  - [x] `transferToProvider()` - Payout to provider
  - [x] `refundBooking()` - Handle refunds
  - [x] `savePaymentMethod()` - Store card
  - [x] `getCustomerPaymentMethods()` - Retrieve cards
  - [x] `getAccountBalance()` - Check balance
- [x] Created `src/lib/stripe-webhooks.ts` - Webhook handlers
- [x] Created example route - `src/routes/booking-payment-example.ts`
- [x] Created documentation - `STRIPE_SETUP.md`
- [x] Environment variables already in schema

## 📝 Next: What You Need to Do

### Step 1: Add to `.env.local` (apps/api)

```bash
STRIPE_SECRET_KEY=rk_test_...  # Your Stripe restricted test key
STRIPE_WEBHOOK_SECRET=whsec_test_xxx  # Get from Stripe Dashboard
```

### Step 2: Get Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Add endpoint: `https://your-api.com/v1/webhooks/stripe`
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `account.updated`
5. Copy the **Signing Secret** → Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Step 3: Create API Route for Webhooks

Create `apps/api/src/routes/webhooks.ts`:

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAndProcessWebhook } from "../lib/stripe-webhooks";

export async function registerWebhookRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/webhooks/stripe",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (await request.rawBody) || request.body;
        const signature = request.headers["stripe-signature"] as string;

        // In production, verify signature:
        // const event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)

        await verifyAndProcessWebhook(body as any, signature);

        return reply.code(200).send({ received: true });
      } catch (error) {
        console.error("Webhook error:", error);
        return reply.code(400).send({ error: "Webhook failed" });
      }
    },
  );
}
```

Then register in `src/index.ts`:

```typescript
import { registerWebhookRoutes } from "./routes/webhooks";

// After other routes
await registerWebhookRoutes(fastify);
```

### Step 4: Create Database Schema for Bookings

You'll need to store:

```typescript
// Booking table
{
  id: string
  motherId: string
  providerId: string
  serviceId: string
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  stripeChargeId: string
  stripePaymentIntentId?: string
  createdAt: Date
  updatedAt: Date
}

// Provider Account table
{
  id: string
  providerId: string
  stripeAccountId: string
  onboardingUrl: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Step 5: Update env.ts (Already Done ✅)

The environment schema already includes:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Step 6: Test Locally

```bash
# Terminal 1: Start API
cd apps/api
npm run dev

# Terminal 2: Test booking payment
curl -X POST http://localhost:3001/v1/bookings/pay \
  -H "Content-Type: application/json" \
  -d '{
    "motherId": "mother_test_123",
    "providerName": "Test Provider",
    "providerEmail": "provider@example.com",
    "providerId": "provider_test_456",
    "serviceId": "service_test_789",
    "amount": 15000,
    "paymentMethodId": "pm_test_4242"
  }'
```

### Step 7: Frontend - Payment Element

Install on web app:

```bash
npm install @stripe/react-stripe-js --workspace=apps/web
```

Create payment form component:

```typescript
import { Elements, PaymentElement } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!)

export default function BookingPayment() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentElement />
    </Elements>
  )
}
```

### Step 8: Deploy to Vercel

Set environment variables in Vercel dashboard:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Then webhook URL becomes: `https://your-vercel-api.com/v1/webhooks/stripe`

## 🧪 Test Scenarios

### Scenario 1: Successful Payment

- Use card `4242 4242 4242 4242`
- Expected: Charge succeeds, webhook fires, provider gets payout

### Scenario 2: Failed Payment

- Use card `4000 0000 0000 0002`
- Expected: Charge fails, mother gets error

### Scenario 3: Dispute (Chargeback)

- Mark charge as disputed in Stripe Dashboard
- Expected: Webhook fires, admin notified

### Scenario 4: Refund

- Call `refundBooking()` function
- Expected: Charge refunded, provider payout reversed

## 📋 Files Ready to Use

| File                                    | Purpose            | Status   |
| --------------------------------------- | ------------------ | -------- |
| `src/lib/stripe.ts`                     | Stripe client      | ✅ Ready |
| `src/lib/stripe-types.ts`               | TypeScript types   | ✅ Ready |
| `src/lib/stripe-service.ts`             | Core functions     | ✅ Ready |
| `src/lib/stripe-webhooks.ts`            | Webhook handlers   | ✅ Ready |
| `src/routes/booking-payment-example.ts` | Example route      | ✅ Ready |
| `STRIPE_SETUP.md`                       | Full documentation | ✅ Ready |

## 🔐 Security Notes

- ✅ Secret key stored in `.env.local` (never committed)
- ✅ Used `rk_test_` restricted key (limited permissions)
- ✅ Webhook signature verification implemented
- ✅ Error handling for all Stripe operations
- ✅ Platform fee calculation included
- ✅ Metadata preserved for reconciliation

## ⏭️ Recommended Order

1. Add environment variables ✅
2. Create webhook route
3. Create booking table in database
4. Integrate payment form on frontend
5. Test end-to-end with test cards
6. Deploy to staging/Vercel
7. Test with live mode keys (when ready)

---

**Ready to proceed?** Let me know if you want help with any of the next steps!
🚀
