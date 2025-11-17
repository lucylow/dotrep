import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Registers OAuth callback routes
 * @param app - Express application instance
 */
export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      console.warn("[OAuth] Missing code or state parameter");
      res.status(400).json({ 
        error: "code and state are required",
        code: "MISSING_PARAMETERS",
      });
      return;
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      
      if (!tokenResponse?.accessToken) {
        console.error("[OAuth] Failed to exchange code for token");
        res.status(401).json({ 
          error: "Failed to authenticate",
          code: "TOKEN_EXCHANGE_FAILED",
        });
        return;
      }

      // Get user information from OAuth provider
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo?.openId) {
        console.error("[OAuth] Missing openId in user info");
        res.status(400).json({ 
          error: "openId missing from user info",
          code: "INVALID_USER_INFO",
        });
        return;
      }

      // Upsert user in database
      try {
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
      } catch (dbError) {
        console.error("[OAuth] Failed to upsert user:", dbError);
        res.status(500).json({ 
          error: "Failed to save user information",
          code: "DATABASE_ERROR",
        });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      if (!sessionToken) {
        console.error("[OAuth] Failed to create session token");
        res.status(500).json({ 
          error: "Failed to create session",
          code: "SESSION_CREATION_FAILED",
        });
        return;
      }

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to home page
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed:", error);
      
      // Provide more specific error information
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = errorMessage.includes("unauthorized") || errorMessage.includes("invalid") ? 401 : 500;
      
      res.status(statusCode).json({ 
        error: "OAuth callback failed",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "OAUTH_CALLBACK_FAILED",
      });
    }
  });
}
