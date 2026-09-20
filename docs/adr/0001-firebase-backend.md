# Firebase (Auth and Firestore) as the backend, Google sign-in only

The backend must be entirely free with no credit card. We chose Firebase Auth and Firestore, with the Firestore SDK called directly from the front end and security rules scoping every document to its owner. Google is the only sign-in provider at first, because Discord is not a native Firebase Auth provider and supporting it needs Cloud Functions, which require the paid Blaze plan.

## Considered Options

- Supabase: native Discord sign-in and no card, but free projects pause after about a week of inactivity.
- Cloudflare Workers with D1: free and no pause, but the API and auth would be written by hand.
