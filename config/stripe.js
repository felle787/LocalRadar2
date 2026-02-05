// Stripe Test Mode Configuration
// Keys are loaded from environment variables

export const STRIPE_CONFIG = {
  // Stripe Publishable Key (Test Mode) - Safe to expose in client-side code
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // Test card numbers loaded from environment
  testCards: {
    success: process.env.EXPO_PUBLIC_STRIPE_TEST_CARD_SUCCESS || '4242424242424242',
    authentication: process.env.EXPO_PUBLIC_STRIPE_TEST_CARD_AUTH || '4000002500003155',
    declined: process.env.EXPO_PUBLIC_STRIPE_TEST_CARD_DECLINED || '4000000000009995',
  },
  
  // For production, you would need a backend server to create payment intents
  // This is a simple demo setup - in production, never expose your secret key
  // Backend URL where you'll handle payment intent creation
  backendUrl: 'YOUR_BACKEND_URL_HERE', // e.g., 'https://your-server.com/create-payment-intent'
};
