// Stripe Test Mode Konfiguration til betalinger
// API nøgler indlæses fra environment variabler (sikre værdier)

export const STRIPE_CONFIG = {
  // Stripe Publishable Key (Test Mode) - Sikker at bruge i client-side kode
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // Test kort numre til udvikling - indlæses fra environment
  testCards: {
    success: process.env.EXPO_PUBLIC_STRIPE_TEST_CARD_SUCCESS || '4242424242424242',         // Succesfuld betaling
    authentication: process.env.EXPO_PUBLIC_STRIPE_TEST_CARD_AUTH || '4000002500003155',     // Kræver 3D Secure
    declined: process.env.EXPO_PUBLIC_STRIPE_TEST_CARD_DECLINED || '4000000000009995',       // Afvist kort
  },
  
  // I produktion skal betalinger håndteres via en backend server
  // VIGTIGT: Stripe secret key må ALDRIG eksponeres i client-side kode
  // Backend URL hvor payment intents oprettes sikkert
  backendUrl: 'YOUR_BACKEND_URL_HERE', // f.eks. 'https://your-server.com/create-payment-intent'
};
