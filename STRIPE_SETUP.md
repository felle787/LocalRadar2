# Stripe Test Mode Setup Instructions

## Overview
Your app now supports Stripe payments in test mode for paid events. Users will be directed to a payment screen when joining events with a ticket price.

## Setup Steps

### 1. Get Your Stripe Test Keys
1. Go to https://dashboard.stripe.com/register (create account if needed)
2. Once logged in, make sure you're in **TEST MODE** (toggle in the left sidebar)
3. Navigate to: Developers → API Keys
4. Copy your **Publishable key** (starts with `pk_test_`)

### 2. Configure the App
Open `config/stripe.js` and replace the placeholder with your test key:

```javascript
export const STRIPE_CONFIG = {
  publishableKey: 'pk_test_YOUR_ACTUAL_KEY_HERE',
  backendUrl: 'YOUR_BACKEND_URL_HERE',
};
```

### 3. Test Cards
When testing payments, use these card numbers:
- **Success**: 4242 4242 4242 4242
- **Requires Authentication**: 4000 0025 0000 3155
- **Card Declined**: 4000 0000 0000 9995

For all test cards:
- Use any future expiry date (e.g., 12/25)
- Use any 3-digit CVC (e.g., 123)
- Use any postal code

## How It Works

### Current Implementation (Test/Demo Mode)
The current setup simulates payments without actually processing them. When a user clicks "Pay", they'll see a dialog to simulate success or failure.

### For Production (Requires Backend)
To process real payments, you need a backend server that:

1. **Creates Payment Intents**: 
   - Your backend calls Stripe's API with your SECRET key
   - Returns a client secret to your app
   
2. **Example Backend Endpoint** (Node.js/Express):
```javascript
app.post('/create-payment-intent', async (req, res) => {
  const { amount, eventId } = req.body;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'nok', // Norwegian Krone
    metadata: { eventId },
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

3. **Update PaymentScreen.js** to call your backend and use the real client secret with Stripe.

## Features Added

✅ Payment screen with Stripe card input
✅ Test mode notices and test card information
✅ Event details displayed before payment
✅ Integration with event registration flow
✅ Separate handling for free vs paid events
✅ Proper navigation flow

## Flow

1. User clicks "Join Event" on a paid event
2. App checks if event has a ticket price > 0
3. If yes → Navigate to Payment screen
4. User enters card details
5. After successful payment → Complete event registration
6. User is registered and receives confirmation

## Testing

1. Create an event with a ticket price (e.g., 100 kr)
2. Try to join the event as a customer
3. You'll be taken to the payment screen
4. Enter test card: 4242 4242 4242 4242
5. Click "Simulate Success" in the dialog
6. Verify you're registered for the event

## Security Notes

⚠️ **Never commit your Stripe keys to git**
- Add `config/stripe.js` to `.gitignore`
- Use environment variables in production
- Keep your SECRET key on the backend only

⚠️ **Test Mode vs Production**
- Test mode keys start with `pk_test_` and `sk_test_`
- Production keys start with `pk_live_` and `sk_live_`
- Test mode won't charge real cards
- Switch to production keys only when ready for real payments

## Next Steps

To implement real payment processing:
1. Set up a backend server (Node.js, Python, etc.)
2. Install Stripe SDK on backend
3. Create payment intent endpoint
4. Update PaymentScreen to call your backend
5. Test thoroughly before going live
6. Switch to production Stripe keys

## Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe Test Cards: https://stripe.com/docs/testing
- React Native Stripe: https://github.com/stripe/stripe-react-native
