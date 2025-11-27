# GitHub OAuth Setup Guide

This document explains how to set up GitHub OAuth with Polkadot wallet signature verification.

## Overview

The implementation provides a complete OAuth flow that:
1. Initiates GitHub OAuth authentication
2. Exchanges the OAuth code for a GitHub access token
3. Creates a cryptographic challenge for the user
4. Verifies a Polkadot wallet signature of the challenge
5. Stores the binding between GitHub account and wallet address in the database

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Session Configuration (for OAuth state and pending binds)
SESSION_SECRET=your-secret-key-here-change-in-production

# Database (required for storing bindings)
DATABASE_URL=mysql://user:password@localhost:3306/dotrep
```

### Production Environment Variables

For production, ensure:
- `OAUTH_CALLBACK_URL` matches your production domain
- `SESSION_SECRET` is a strong, randomly generated secret
- Use HTTPS for `OAUTH_CALLBACK_URL` in production

## GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: DotRep (or your app name)
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback` (must match `OAUTH_CALLBACK_URL`)
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add these to your `.env` file

## API Endpoints

### `GET /auth/github/login`
Initiates the GitHub OAuth flow. Redirects user to GitHub for authorization.

**Query Parameters:**
- `return_url` (optional): URL to redirect to after successful binding

**Example:**
```
GET /auth/github/login?return_url=/dashboard
```

### `GET /auth/github/callback`
GitHub OAuth callback endpoint. Exchanges the OAuth code for an access token, fetches user info, creates a challenge, and redirects to the frontend.

**Query Parameters:**
- `code`: OAuth authorization code (provided by GitHub)
- `state`: OAuth state parameter (for CSRF protection)

**Flow:**
1. Validates state parameter
2. Exchanges code for access token
3. Fetches GitHub user information
4. Creates a cryptographic challenge
5. Stores pending bind in session
6. Redirects to `/connect?pending=1`

### `GET /auth/github/pending-challenge`
Retrieves the pending challenge for the current session.

**Response:**
```json
{
  "ok": true,
  "githubId": "12345678",
  "login": "octocat",
  "challenge": "dotrep:bind:12345678:1234567890123"
}
```

**Errors:**
- `404`: No pending bind found
- `410`: Pending bind expired (5 minutes TTL)

### `POST /auth/github/verify-signature`
Verifies the Polkadot wallet signature and completes the binding.

**Request Body:**
```json
{
  "githubId": "12345678",
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "signature": "0x1234...",
  "message": "dotrep:bind:12345678:1234567890123"
}
```

**Response:**
```json
{
  "ok": true,
  "binding": {
    "githubId": "12345678",
    "githubUsername": "octocat",
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  }
}
```

**Errors:**
- `400`: Missing fields, challenge mismatch, or invalid signature
- `410`: Pending bind expired
- `500`: Server error

### `GET /bindings/:githubId`
Retrieves the binding for a specific GitHub ID (for verification/demo).

**Response:**
```json
{
  "ok": true,
  "binding": {
    "githubId": "12345678",
    "githubUsername": "octocat",
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "verified": true
  }
}
```

## Frontend Flow

1. User clicks "Connect with GitHub" button
2. Frontend redirects to `/auth/github/login`
3. Backend redirects to GitHub OAuth page
4. User authorizes on GitHub
5. GitHub redirects to `/auth/github/callback?code=...&state=...`
6. Backend creates challenge and redirects to `/connect?pending=1`
7. Frontend detects `pending=1` and fetches challenge from `/auth/github/pending-challenge`
8. Frontend requests signature from Polkadot wallet extension
9. Frontend submits signature to `/auth/github/verify-signature`
10. Backend verifies signature and stores binding
11. Frontend shows success message

## Security Considerations

### OAuth State Validation
- Uses cryptographically secure random bytes for state generation
- State is stored in session and validated on callback
- Prevents CSRF attacks

### Challenge Design
- Challenge includes: `dotrep:bind:{githubId}:{timestamp}`
- 5-minute TTL for pending binds
- Each challenge can only be used once
- Challenge is tied to the session

### Signature Verification
- Uses `@polkadot/util-crypto` for signature verification
- Supports common Polkadot key types (sr25519, ed25519)
- Verifies signature against the original challenge message

### Session Security
- Sessions stored server-side with secure cookies
- `httpOnly` flag prevents XSS attacks
- `secure` flag enabled in production (HTTPS only)
- Session expires after 5 minutes for pending binds

### Database
- Bindings stored in `contributors` table
- `githubId` is unique (prevents duplicate bindings)
- Wallet address can be updated (allows wallet changes)

## Production Recommendations

1. **Use Redis for Sessions**
   - Replace in-memory session store with Redis
   - Better for horizontal scaling
   - Allows session sharing across instances

2. **Strong Session Secret**
   - Use `crypto.randomBytes(32).toString('hex')` to generate
   - Store securely (environment variable, secret manager)

3. **Rate Limiting**
   - Add rate limiting to `/auth/github/verify-signature`
   - Prevent abuse of signature verification endpoint

4. **HTTPS Only**
   - Always use HTTPS in production
   - Required for secure cookies
   - GitHub OAuth requires HTTPS for callback URL in production

5. **Database Indexing**
   - Ensure `githubId` has unique index
   - Add index on `walletAddress` for lookups

6. **Logging and Monitoring**
   - Log OAuth flow events
   - Monitor failed signature verifications
   - Track binding creation/updates

7. **Error Handling**
   - Graceful error messages for users
   - Don't expose sensitive errors to frontend
   - Log detailed errors server-side

## Testing

### Local Testing
1. Set up GitHub OAuth app with `http://localhost:3000/auth/github/callback`
2. Install Polkadot{.js} browser extension
3. Create a test account or use existing wallet
4. Follow the OAuth flow

### Testing Endpoints
```bash
# Start OAuth flow
curl -L http://localhost:3000/auth/github/login

# After OAuth callback, get pending challenge (requires session cookie)
curl -b cookies.txt http://localhost:3000/auth/github/pending-challenge

# Verify signature (requires session cookie)
curl -X POST http://localhost:3000/auth/github/verify-signature \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"githubId":"12345678","address":"5Grwva...","signature":"0x1234...","message":"dotrep:bind:12345678:1234567890123"}'

# Get binding
curl http://localhost:3000/bindings/12345678
```

## Troubleshooting

### "Missing GitHub OAuth env vars"
- Ensure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `OAUTH_CALLBACK_URL` are set
- Check `.env` file is loaded correctly

### "Invalid state"
- OAuth state mismatch - usually means session expired or tampered with
- Clear cookies and try again

### "No pending bind in session"
- Session expired (5 minutes) or was cleared
- Start OAuth flow again

### "Invalid signature"
- Signature doesn't match the challenge
- Ensure wallet extension is properly signing the exact challenge message
- Check that the challenge message hasn't been modified

### Extension not found
- Install [Polkadot{.js} extension](https://polkadot.js.org/extension/)
- Ensure extension is enabled and unlocked
- Grant permissions to the website

## Database Schema

The binding is stored in the `contributors` table:

```typescript
{
  githubId: string;          // GitHub user ID (unique)
  githubUsername: string;    // GitHub username
  githubAvatar: string | null;
  walletAddress: string;     // Polkadot wallet address
  verified: boolean;         // Whether binding is verified
  reputationScore: number;
  totalContributions: number;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

## Next Steps

After successful binding, you can:
1. Track contributions for the linked GitHub account
2. Issue on-chain claims/certificates
3. Generate reputation scores
4. Create SBTs (Soul-Bound Tokens) for verified contributors
5. Build reputation-based features


