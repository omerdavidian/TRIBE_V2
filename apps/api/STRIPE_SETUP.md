# Stripe Integration for TRIBE-V2

## 📋 Overview

This guide walks through the Stripe integration for TRIBE-V2, a postpartum care
marketplace. The integration handles:

- **Payments**: Mothers pay for services
- **Transfers**: Automatic payouts to providers
- **Refunds**: Handle cancellations and disputes
- **Connect**: Provider onboarding and account management

## 🔧 Setup

### 1. Environment Variables

Add to `.env.local` (apps/api):

```bash
STRIPE_SECRET_KEY=rk_test_...  # Your Stripe restricted test key
STRIPE_WEBHOOK_SECRET=whsec_test_... # Get from Stripe Dashboard → Webhooks
```

### 2. Test Mode vs Live

- **Development**: Use `rk_test_*` keys (test mode)
- **Production**: Switch to `rk_live_*` keys (live mode)

## 📁 File Structure

```
apps/api/src/lib/
├── stripe.ts                    # Stripe client initialization
├── stripe-types.ts              # TypeScript interfaces
├── stripe-service.ts            # Core payment functions
└── stripe-webhooks.ts           # Webhook event handlers

apps/api/src/routes/
└── booking-payment-example.ts   # Example route
```

## 💳 Core Functions

### Create a Booking Payment

```typescript
import { createBookingCharge, ensureCustomer } from "@/lib/stripe-service";

// 1. Ensure customer exists in Stripe
const customerId = await ensureCustomer("mother_123", {
  motherId: "mother_123",
  email: "mother@example.com",
  name: "Jane Doe",
});

// 2. Create charge
const result = await createBookingCharge({
  customerId,
  motherId: "mother_123",
  providerId: "provider_456",
  serviceId: "service_789",
  amount: 15000, // $150.00 in cents
  currency: "usd",
  description: "TRIBE Booking - Postpartum Support",
  paymentMethodId: "pm_xxx_from_client",
});

console.log(`Charge created: ${result.chargeId}`);
console.log(`Status: ${result.status}`);
```

### Create Provider Connect Account

```typescript
import { createProviderConnectedAccount } from "@/lib/stripe-service";

const account = await createProviderConnectedAccount({
  providerId: "provider_456",
  email: "provider@example.com",
  name: "Sarah Support Services",
  businessType: "individual",
});

// Send this URL to provider for onboarding
console.log(`Provider onboarding link: ${account.onboardingUrl}`);
```

### Transfer Funds to Provider

```typescript
import { transferToProvider } from "@/lib/stripe-service";

const platformFee = 1200; // $12.00 = 8% of $150
const providerAmount = 15000 - platformFee; // $138.00

const transfer = await transferToProvider(
  "acct_provider123", // Provider's Stripe account ID
  providerAmount,
  "Payment for service booking",
);

console.log(`Transfer created: ${transfer.transferId}`);
console.log(`Will arrive: ${transfer.arrivalDate}`);
```

### Refund a Booking

```typescript
import { refundBooking } from "@/lib/stripe-service";

const refund = await refundBooking({
  chargeId: "ch_xxx",
  amount: 15000, // Full refund
  reason: "requested_by_customer",
});

console.log(`Refund processed: ${refund.refundId}`);
```

## 🪝 Webhooks

Stripe sends webhooks for important events. Set up in Stripe Dashboard:

1. Go to **Webhooks** section
2. Add endpoint: `https://your-api.com/v1/webhooks/stripe`
3. Select events to listen for

### Handled Events

| Event                           | Action                                 |
| ------------------------------- | -------------------------------------- |
| `payment_intent.succeeded`      | Update booking status, schedule payout |
| `payment_intent.payment_failed` | Notify mother, suggest retry           |
| `charge.refunded`               | Update booking, reverse payout         |
| `charge.dispute.created`        | Alert admin, investigate chargeback    |
| `account.updated`               | Update provider onboarding status      |

### Example Webhook Handler

```typescript
// In API route: POST /v1/webhooks/stripe

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  try {
    const event = await stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    await verifyAndProcessWebhook(body, signature);

    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }
}
```

## 🏗️ Architecture: Payment Flow

```
┌─────────────────────────────────────────────────────┐
│ Mother Books Service                                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Frontend creates       │
         │ Payment Method (Card)  │
         │ → Returns pm_xxx       │
         └────────────┬───────────┘
                      │
                      ▼
         ┌───────────────────────────────────────┐
         │ Backend: POST /v1/bookings/pay        │
         │ - Create charge ($150)                │
         │ - Calculate platform fee ($12)        │
         │ - Save charge ID in DB                │
         └────────────┬────────────────────────────┘
                      │
                      ▼
         ┌───────────────────────────────────────┐
         │ Stripe receives charge                 │
         │ Processes payment with card           │
         └────────────┬────────────────────────────┘
                      │
                      ▼
         ┌───────────────────────────────────────┐
         │ Stripe sends webhook:                  │
         │ payment_intent.succeeded              │
         └────────────┬────────────────────────────┘
                      │
                      ▼
         ┌───────────────────────────────────────┐
         │ Backend webhook handler:              │
         │ - Update booking to "paid"            │
         │ - Transfer $138 to provider           │
         │ - Send confirmation emails            │
         └───────────────────────────────────────┘
```

## 💰 Platform Economics

- **Payment Amount**: $150.00
- **Platform Fee** (8%): $12.00
- **Provider Payout**: $138.00
- **Fee Calculation**: `Math.round((amount * 8) / 100)`

Modify `PLATFORM_FEE_PERCENT` in `stripe-service.ts` to change.

## ⚠️ Important: Testing

### Test Card Numbers (Stripe Test Mode)

```
Success: 4242 4242 4242 4242
Failure: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

Use any future expiry and any CVC.

### Testing a Booking

```bash
curl -X POST http://localhost:3001/v1/bookings/pay \
  -H "Content-Type: application/json" \
  -d '{
    "motherId": "mother_test_123",
    "providerName": "Test Provider",
    "providerEmail": "provider@example.com",
    "providerId": "provider_test_456",
    "serviceId": "service_test_789",
    "amount": 15000,
    "paymentMethodId": "pm_test_from_client"
  }'
```

## 🔐 Security Checklist

- ✅ Never expose `STRIPE_SECRET_KEY` in frontend code
- ✅ Always verify webhook signatures
- ✅ Use HTTPS in production
- ✅ Never log full payment details
- ✅ Validate all user input with Zod schemas
- ✅ Use restricted API keys (limited permissions)
- ✅ Implement idempotent charge creation (prevent duplicates)
- ✅ Store charge IDs in database for reconciliation

## 🚨 Error Handling

```typescript
try {
  const charge = await createBookingCharge(payload);
} catch (error) {
  if (error instanceof Stripe.errors.CardError) {
    // Card declined
    console.error("Card declined:", error.message);
  } else if (error instanceof Stripe.errors.RateLimitError) {
    // API rate limit
    console.error("Too many requests");
  } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    // Invalid parameters
    console.error("Invalid request:", error.message);
  } else {
    // Network error
    console.error("Network error:", error);
  }
}
```

## 📊 Monitoring

Key metrics to track:

- Payment success rate
- Average processing time
- Refund rate
- Dispute rate
- Provider payout delays

Set up alerts in Stripe Dashboard for:

- High dispute ratio
- Failed transfers
- Webhook delivery failures

## 🔄 Reconciliation

Regularly reconcile Stripe charges with database records:

```typescript
// Example: Daily reconciliation job
async function reconcileCharges() {
  const stripeCharges = await stripe.charges.list({ limit: 100 });
  const dbBookings = await db.booking.findMany();

  for (const charge of stripeCharges.data) {
    const booking = dbBookings.find((b) => b.stripeChargeId === charge.id);
    if (!booking) {
      console.warn(`Orphaned charge: ${charge.id}`);
    }
  }
}
```

## 📚 Resources

- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Webhook Best Practices](https://stripe.com/docs/webhooks)
- [Testing Stripe](https://stripe.com/docs/testing)

## ⏭️ Next Steps

1. **Create webhook endpoint** in your API
2. **Implement database schema** for bookings and charges
3. **Add payment form** to frontend (Stripe Elements or Payment Element)
4. **Test end-to-end** with test cards
5. **Set up monitoring** and alerts
6. **Plan transition** from test to live mode

---

**Status**: Ready to test! Run `npm run dev` and test a booking payment with the
example route.
