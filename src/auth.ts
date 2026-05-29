import { config } from "./config.js";

class CookieJar {
  private cookies: Map<string, string> = new Map();

  public update(setCookieHeaders: string[]) {
    for (const header of setCookieHeaders) {
      const firstPart = header.split(";")[0] || "";
      const idx = firstPart.indexOf("=");
      if (idx > 0) {
        const key = firstPart.slice(0, idx).trim();
        const value = firstPart.slice(idx + 1).trim();
        this.cookies.set(key, value);
      }
    }
  }

  public getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([key, val]) => `${key}=${val}`)
      .join("; ");
  }

  public hasCookies(): boolean {
    return this.cookies.size > 0;
  }

  public clear() {
    this.cookies.clear();
  }
}

export const cookieJar = new CookieJar();

let isLoggingIn = false;
let loginPromise: Promise<string> | null = null;

export async function login(): Promise<string> {
  if (isLoggingIn && loginPromise) {
    return loginPromise;
  }

  isLoggingIn = true;
  loginPromise = (async () => {
    try {
      if (config.TIMEIQ_LOG_LEVEL === "debug") {
        console.error("🔑 Attempting to sign in to TimeIQ...");
      }
      
      const url = `${config.TIMEIQ_BASE_URL}/api/signin`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          username: config.TIMEIQ_EMAIL,
          password: config.TIMEIQ_PASSWORD,
          rememberme: true,
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout for login
      });

      if (!response.ok) {
        let errMsg = `Sign in failed with status ${response.status}`;
        try {
          const body = await response.json() as any;
          if (body && body.message) {
            errMsg = body.message;
          } else if (body && body.errors) {
            errMsg = typeof body.errors === "string" ? body.errors : JSON.stringify(body.errors);
          }
        } catch {
          // ignore parsing error
        }
        const err = new Error(errMsg) as any;
        err.status = response.status;
        throw err;
      }

      // Capture Set-Cookie headers
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) {
        cookieJar.update(setCookies);
      } else {
        const legacySetCookie = response.headers.get("set-cookie");
        if (legacySetCookie) {
          cookieJar.update([legacySetCookie]);
        }
      }

      if (config.TIMEIQ_LOG_LEVEL === "debug") {
        console.error("🔒 Session cookie successfully acquired.");
      }

      return cookieJar.getCookieHeader();
    } catch (err: any) {
      console.error("❌ TimeIQ login failed:", err.message);
      throw err;
    } finally {
      isLoggingIn = false;
      loginPromise = null;
    }
  })();

  return loginPromise;
}

export async function getSessionCookie(): Promise<string> {
  if (cookieJar.hasCookies()) {
    return cookieJar.getCookieHeader();
  }
  return login();
}
