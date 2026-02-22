

## Problem

The `lucid-engine` edge function returns **401 Unauthorized** because it requires an authenticated user (`user_id` from JWT), but there is no authentication system in the app. The `/test` page calls the function without a logged-in session.

## Solution

Two changes are needed:

### 1. Create a simple auth page (`/auth`)
A basic sign-up / sign-in page using email + password so a user session exists when calling the engine.

### 2. Update the `/test` page
- Check if the user is logged in before showing the test UI
- If not logged in, redirect to `/auth`
- Show a "Logout" button for convenience
- Display the current `user_id` so it's clear who is calling

### 3. Update routing in `App.tsx`
- Add the `/auth` route

---

## Technical Details

### Auth page (`src/pages/Auth.tsx`)
- Two tabs: "Sign In" and "Sign Up"
- Uses `supabase.auth.signInWithPassword()` and `supabase.auth.signUp()`
- On success, redirects to `/test`
- Simple form: email + password

### Test page updates (`src/pages/Test.tsx`)
- Uses `supabase.auth.getSession()` on mount to check auth state
- Listens to `onAuthStateChange` for live updates
- If no session, redirects to `/auth`
- Shows user email and a logout button at the top

### No database changes needed
The `users` table already exists. Auth will work with the existing setup. No new migration required.

### Email confirmation
Email confirmation is required by default. After signing up, the user needs to confirm their email before logging in. If you want to skip this for testing, we can enable auto-confirm.

