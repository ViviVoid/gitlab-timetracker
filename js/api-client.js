/**
 * API Client with request management, retries, and concurrent limiting
 */

class ConcurrentLimiter {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.currentCount = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.currentCount >= this.maxConcurrent) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.currentCount++;
    try {
      return await fn();
    } finally {
      this.currentCount--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

class ApiClient {
  constructor(maxRetries = 3, timeout = 90000) {
    this.timeout = timeout; // 90 second timeout
    this.maxRetries = maxRetries;
    this.limiter = new ConcurrentLimiter(10); // Global request limiter
    this.requestLog = [];
  }

  async fetch(url, options = {}, retryCount = 0) {
    // Use the global limiter to prevent overwhelming the API
    return this.limiter.run(async () => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.timeout);
      const startTime = Date.now();

      try {
        const response = await fetch(url, {
          ...options,
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Log the request
        this.requestLog.push({
          url: url.substring(0, 100),
          status: response.status,
          duration: duration,
          timestamp: new Date().toISOString(),
        });

        // Keep only last 50 requests
        if (this.requestLog.length > 50) {
          this.requestLog.shift();
        }

        // If rate limited (429), wait and retry
        if (response.status === 429 && retryCount < this.maxRetries) {
          const retryAfter =
            parseInt(response.headers.get("Retry-After") || "10") * 1000;
          console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
          await this.delay(retryAfter);
          return this.fetch(url, options, retryCount + 1);
        }

        // If server error, retry with exponential backoff
        if (response.status >= 500 && retryCount < this.maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
          console.warn(
            `Server error ${response.status}. Retrying in ${delay}ms...`,
          );
          await this.delay(delay);
          return this.fetch(url, options, retryCount + 1);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (error.name === "AbortError") {
          const message =
            duration >= this.timeout
              ? `Request timeout after ${this.timeout}ms`
              : "Request cancelled";
          console.error(`[${message}] ${url.substring(0, 100)}`);

          // Log timeout for debugging
          this.requestLog.push({
            url: url.substring(0, 100),
            status: "TIMEOUT",
            duration: duration,
            timestamp: new Date().toISOString(),
          });

          throw new Error(message);
        }
        throw error;
      }
    });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRequestLog() {
    return this.requestLog;
  }

  clearRequestLog() {
    this.requestLog = [];
  }
}

// Export for use
const apiClient = new ApiClient();
