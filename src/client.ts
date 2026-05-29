import { config } from "./config.js";
import { getSessionCookie, login, cookieJar } from "./auth.js";

export class TimeIQError extends Error {
  public status: number;
  public errors: any;

  constructor(message: string, status: number, errors?: any) {
    super(message);
    this.name = "TimeIQError";
    this.status = status;
    this.errors = errors;
    Object.setPrototypeOf(this, TimeIQError.prototype);
  }
}

export interface TimeIQClient {
  get<T>(path: string, query?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, body?: unknown, options?: { dryRun?: boolean }): Promise<T>;
  put<T>(path: string, body?: unknown, options?: { dryRun?: boolean }): Promise<T>;
  delete<T>(path: string, body?: unknown, options?: { dryRun?: boolean }): Promise<T>;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, unknown>,
  dryRunOverride?: boolean
): Promise<T> {
  const isWrite = ["POST", "PUT", "DELETE"].includes(method);
  
  // Dry run safety checks
  const isDryRun = dryRunOverride !== undefined ? dryRunOverride : config.TIMEIQ_DRY_RUN;
  if (isWrite && isDryRun) {
    if (config.TIMEIQ_LOG_LEVEL === "debug" || config.TIMEIQ_DRY_RUN) {
      console.error(`🛡️ [DRY RUN SIMULATION] Blocked ${method} to ${path}`);
    }
    return {
      dry_run: true,
      request: {
        method,
        path,
        body,
      },
    } as unknown as T;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Globally encode dynamic path segments to prevent path injection and broken URLs (M1)
  const staticKeys = new Set([
    "api", "projects", "clients", "time", "people", "timer", "expenses", 
    "expensetypes", "expensecategories", "services", "servicecategories", 
    "timesheets", "timesheetperiods", "required_time", "notifications", 
    "invoices", "lineitems", "settings", "billing_info", "bt", "import", 
    "export", "actions", "action", "date", "invoice_number", "preferences", 
    "managed", "archived", "signin", "signout", "forgotPassword", 
    "resetPassword", "verifySecurityToken", "changePassword", 
    "resendLoginInformation", "previous", "next", "dismiss", 
    "missing_time_reminder", "timesheet_reminder", "paid", "unpaid", 
    "writtenoff", "send", "timezones", "url", "token", "update", 
    "delete", "updateTimeEntry", "batch", "standard", "classic", 
    "classicTime", "custom", "period", "payroll", "recentActivity", 
    "missingTime", "incompleteTime", "search"
  ]);

  const segments = cleanPath.split("/");
  const encodedSegments = segments.map((seg) => {
    if (!seg || staticKeys.has(seg.toLowerCase())) {
      return seg;
    }
    return encodeURIComponent(seg);
  });
  const finalPath = encodedSegments.join("/");
  let url = `${config.TIMEIQ_BASE_URL}${finalPath}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          val.forEach((v) => params.append(key, String(v)));
        } else {
          params.append(key, String(val));
        }
      }
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  let attempt = 0;
  const maxRetries = 2; // exponential backoff up to twice
  let hasRelogged = false;
  
  while (true) {
    try {
      const cookie = await getSessionCookie();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": cookie,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      // Handle 401 Unauthorized (attempt re-login exactly once)
      if (response.status === 401) {
        if (!hasRelogged) {
          if (config.TIMEIQ_LOG_LEVEL === "debug") {
            console.error("🔑 401 Unauthorized detected. Clearing cookie jar and re-logging in...");
          }
          cookieJar.clear();
          await login();
          hasRelogged = true;
          continue;
        } else {
          throw new TimeIQError("Authentication session expired permanently", 401);
        }
      }

      // Handle 5xx errors (retry once after 500 ms)
      if (response.status >= 500 && response.status < 600) {
        if (attempt < maxRetries) {
          const waitTime = attempt === 0 ? 500 : 2000;
          if (config.TIMEIQ_LOG_LEVEL === "debug") {
            console.error(`⚠️ Server error ${response.status}. Retrying in ${waitTime}ms...`);
          }
          await delay(waitTime);
          attempt++;
          continue;
        } else {
          throw new TimeIQError(`Server returned critical error ${response.status}`, response.status);
        }
      }

      if (!response.ok) {
        let errMsg = `Request failed with status ${response.status}`;
        let errors: any = undefined;
        try {
          const resBody = await response.json() as any;
          if (resBody) {
            errMsg = resBody.message || errMsg;
            errors = resBody.errors || errors;
          }
        } catch {
          // ignore parsing error
        }
        throw new TimeIQError(errMsg, response.status, errors);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof TimeIQError) {
        throw err;
      }
      // If error has a structured HTTP status from auth login throw it directly
      if (err.status && err.status > 0) {
        throw new TimeIQError(err.message, err.status);
      }
      // Handle timeout specifically
      if (err.name === "TimeoutError") {
        throw new TimeIQError("Request timed out after 30 seconds", 0);
      }
      
      // Handle network errors (retry up to twice with exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = attempt === 0 ? 500 : 2000;
        if (config.TIMEIQ_LOG_LEVEL === "debug") {
          console.error(`🌐 Network error: ${err.message}. Retrying in ${waitTime}ms...`);
        }
        await delay(waitTime);
        attempt++;
        continue;
      }
      throw new TimeIQError(`Network connection failed: ${err.message}`, 0);
    }
  }
}

export const client: TimeIQClient = {
  get: <T>(path: string, query?: Record<string, unknown>) =>
    request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown, options?: { dryRun?: boolean }) =>
    request<T>("POST", path, body, undefined, options?.dryRun),
  put: <T>(path: string, body?: unknown, options?: { dryRun?: boolean }) =>
    request<T>("PUT", path, body, undefined, options?.dryRun),
  delete: <T>(path: string, body?: unknown, options?: { dryRun?: boolean }) =>
    request<T>("DELETE", path, body, undefined, options?.dryRun),
};
