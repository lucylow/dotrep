import express, { type Express, type Request, type Response } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import axios from "axios";
import { signatureVerify } from "@polkadot/util-crypto";
import { randomBytes } from "crypto";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";

// Extend session type to include pending bind
declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    returnUrl?: string;
    pendingBind?: {
      githubId: string;
      login: string;
      challenge: string;
      accessToken: string;
      createdAt: number;
    };
  }
}

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  OAUTH_CALLBACK_URL,
  SESSION_SECRET = "dev-session-secret-change-in-production",
} = process.env;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !OAUTH_CALLBACK_URL) {
  console.warn(
    "⚠️  Missing GitHub OAuth env vars. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, OAUTH_CALLBACK_URL"
  );
}

// Helper: create a deterministic challenge for signature (server side)
function makeChallenge(githubId: string): string {
  // Include timestamp to avoid reuse — but keep short TTL on server (~5 minutes)
  const ts = Date.now();
  // Use a domain/tag so message is clear for users
  return `dotrep:bind:${githubId}:${ts}`;
}

// Session configuration
export function configureSession(app: Express) {
  app.use(cookieParser());
  app.use(
    session({
      name: "dotrep.sid",
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 5 * 60 * 1000, // 5 minutes for pending binds
        path: "/",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    })
  );
}

// Register GitHub OAuth routes
export function registerGitHubOAuthRoutes(app: Express) {
  // Step 1: Start OAuth flow
  app.get("/auth/github/login", (req: Request, res: Response) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !OAUTH_CALLBACK_URL) {
      return res.status(500).json({
        ok: false,
        error: "GitHub OAuth not configured. Check environment variables.",
      });
    }

    // Generate cryptographically secure state
    const state = randomBytes(32).toString("hex");
    req.session!.oauthState = state;

    // Optional: allow passing a return URL via query param (validate it!)
    const returnUrl = req.query.return_url as string | undefined;
    if (returnUrl) {
      // Store return URL in session for redirect after OAuth
      req.session!.returnUrl = returnUrl;
    }

    const redirect = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      GITHUB_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(OAUTH_CALLBACK_URL)}&scope=read:user,user:email&state=${encodeURIComponent(
      state
    )}`;

    res.redirect(redirect);
  });

  // Step 2: OAuth callback — exchange code, fetch GitHub user, return challenge
  app.get("/auth/github/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).send("Missing code or state");
      }

      // Validate state
      if (!req.session!.oauthState || req.session!.oauthState !== state) {
        return res.status(403).send("Invalid state");
      }

      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !OAUTH_CALLBACK_URL) {
        return res.status(500).json({
          ok: false,
          error: "GitHub OAuth not configured",
        });
      }

      // Exchange code for access token
      const tokenResp = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: OAUTH_CALLBACK_URL,
        },
        {
          headers: { Accept: "application/json" },
        }
      );

      const tokenData = tokenResp.data;
      if (!tokenData.access_token) {
        return res.status(500).json({
          ok: false,
          error: "No access token from GitHub",
          details: tokenData,
        });
      }

      const accessToken = tokenData.access_token as string;

      // Fetch user info
      const userResp = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const ghUser = userResp.data;
      const githubId = String(ghUser.id);
      const login = ghUser.login;

      // Create challenge and store ephemeral session info
      const challenge = makeChallenge(githubId);
      req.session!.pendingBind = {
        githubId,
        login,
        challenge,
        accessToken,
        createdAt: Date.now(),
      };

      // Clear OAuth state
      delete req.session!.oauthState;

      // Redirect to frontend connect page with pending flag
      const frontendRedirect = `/connect?pending=1`;
      res.redirect(frontendRedirect);
    } catch (err: any) {
      console.error("OAuth callback error", err?.response?.data || err.message || err);
      res.status(500).send("OAuth callback failed");
    }
  });

  // Helper to expose the pending challenge to the browser via an authenticated session
  app.get("/auth/github/pending-challenge", (req: Request, res: Response) => {
    const pending = req.session!.pendingBind;

    if (!pending) {
      return res.status(404).json({
        ok: false,
        error: "No pending bind in session",
      });
    }

    // Check TTL (5 minutes)
    const age = Date.now() - pending.createdAt;
    if (age > 5 * 60 * 1000) {
      delete req.session!.pendingBind;
      return res.status(410).json({
        ok: false,
        error: "Pending bind expired",
      });
    }

    // Return the challenge and the github login/id for UX
    return res.json({
      ok: true,
      githubId: pending.githubId,
      login: pending.login,
      challenge: pending.challenge,
    });
  });

  // Step 3: Verify signature that the user signs with their Polkadot wallet
  app.post("/auth/github/verify-signature", async (req: Request, res: Response) => {
    try {
      const { githubId, address, signature, message } = req.body as {
        githubId: string;
        address: string;
        signature: string; // hex string from polkadot signer (0x...)
        message: string; // original challenge (should match server's)
      };

      // Basic validation
      if (!githubId || !address || !signature || !message) {
        return res.status(400).json({
          ok: false,
          error: "Missing fields",
        });
      }

      // Check session pending bind
      const pending = req.session!.pendingBind;
      if (!pending || pending.githubId !== githubId || pending.challenge !== message) {
        return res.status(400).json({
          ok: false,
          error: "No matching pending bind session or challenge mismatch",
        });
      }

      // Check TTL (5 minutes)
      const age = Date.now() - pending.createdAt;
      if (age > 5 * 60 * 1000) {
        delete req.session!.pendingBind;
        return res.status(410).json({
          ok: false,
          error: "Pending bind expired",
        });
      }

      // Use @polkadot/util-crypto to verify signature
      const verified = signatureVerify(message, signature, address);
      const isValid = verified.isValid;

      if (!isValid) {
        return res.status(400).json({
          ok: false,
          error: "Invalid signature",
        });
      }

      // SUCCESS: Store binding in database
      try {
        // Check if contributor already exists
        const existingContributor = await db.getContributorByGithubId(githubId);

        if (existingContributor) {
          // Update existing contributor with wallet address
          await db.updateContributorWallet(githubId, address);
        } else {
          // Fetch additional GitHub user info (avatar)
          let githubAvatar: string | null = null;
          try {
            const userResp = await axios.get("https://api.github.com/user", {
              headers: {
                Authorization: `token ${pending.accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            });
            githubAvatar = userResp.data.avatar_url || null;
          } catch (err) {
            console.warn("Failed to fetch GitHub avatar:", err);
          }

          // Create new contributor
          await db.createContributor({
            githubId,
            githubUsername: pending.login,
            githubAvatar,
            walletAddress: address,
            verified: true,
          });
        }
      } catch (dbError: any) {
        console.error("Database error during binding:", dbError);
        return res.status(500).json({
          ok: false,
          error: "Failed to store binding",
          details: dbError.message,
        });
      }

      // Clear pendingBind from session
      delete req.session!.pendingBind;

      return res.json({
        ok: true,
        binding: {
          githubId,
          githubUsername: pending.login,
          walletAddress: address,
        },
      });
    } catch (err: any) {
      console.error("verify-signature error", err?.message || err);
      return res.status(500).json({
        ok: false,
        error: "Server verification error",
      });
    }
  });

  // Simple endpoint to fetch binding (for demo/verification)
  app.get("/bindings/:githubId", async (req: Request, res: Response) => {
    try {
      const githubId = req.params.githubId;
      const contributor = await db.getContributorByGithubId(githubId);

      if (!contributor || !contributor.walletAddress) {
        return res.status(404).json({ ok: false });
      }

      return res.json({
        ok: true,
        binding: {
          githubId: contributor.githubId,
          githubUsername: contributor.githubUsername,
          walletAddress: contributor.walletAddress,
          verified: contributor.verified,
        },
      });
    } catch (err: any) {
      console.error("Error fetching binding:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}

