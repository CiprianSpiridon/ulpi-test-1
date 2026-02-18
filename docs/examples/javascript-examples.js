/**
 * Enterprise URL Shortener API - JavaScript Examples
 *
 * This file contains comprehensive examples of how to interact with the
 * Enterprise URL Shortener API using JavaScript/Node.js
 *
 * Requirements:
 * - node-fetch (for Node.js) or built-in fetch (modern browsers/Node 18+)
 * - A valid API access token
 */

// For Node.js environments without built-in fetch
// npm install node-fetch
// const fetch = require('node-fetch');

/**
 * URL Shortener API Client Class
 * Handles authentication, error handling, and rate limiting
 */
class URLShortenerAPI {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.urlshortener.com';
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.onTokenRefresh = config.onTokenRefresh || null;

    // Request defaults
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'URLShortener-JS-Client/1.0.0'
    };
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };

    // Add authentication if token available
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const requestOptions = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, requestOptions);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RateLimit-Reset');
        const error = new Error(`Rate limited. Retry after ${retryAfter} seconds`);
        error.code = 'RATE_LIMITED';
        error.retryAfter = parseInt(retryAfter);
        throw error;
      }

      // Handle token expiration with automatic refresh
      if (response.status === 401 && this.refreshToken) {
        console.log('Access token expired, attempting refresh...');
        await this.refreshAccessToken();

        // Retry original request with new token
        headers.Authorization = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, { ...requestOptions, headers });
        return this._handleResponse(retryResponse);
      }

      return this._handleResponse(response);

    } catch (error) {
      console.error('API Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle API response and extract data
   */
  async _handleResponse(response) {
    const contentType = response.headers.get('content-type');

    // Handle redirects (for short URL clicks)
    if (response.status >= 300 && response.status < 400) {
      return {
        status: response.status,
        location: response.headers.get('location'),
        headers: Object.fromEntries(response.headers)
      };
    }

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`);
      error.code = data.error || 'API_ERROR';
      error.status = response.status;
      error.details = data.details;
      throw error;
    }

    // Include rate limit info in successful responses
    data._rateLimit = {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset')
    };

    return data.data || data;
  }

  /**
   * Authentication Methods
   */

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    // Store tokens
    this.accessToken = response.tokens.accessToken;
    this.refreshToken = response.tokens.refreshToken;

    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    // Store tokens
    this.accessToken = response.tokens.accessToken;
    this.refreshToken = response.tokens.refreshToken;

    if (this.onTokenRefresh) {
      this.onTokenRefresh(this.accessToken, this.refreshToken);
    }

    return response;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    this.accessToken = response.accessToken;

    if (this.onTokenRefresh) {
      this.onTokenRefresh(this.accessToken, this.refreshToken);
    }

    return response;
  }

  /**
   * URL Management Methods
   */

  async createURL(urlData) {
    return this.request('/urls', {
      method: 'POST',
      body: JSON.stringify(urlData)
    });
  }

  async getURLs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/urls${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getURL(id) {
    return this.request(`/urls/${id}`);
  }

  async updateURL(id, updateData) {
    return this.request(`/urls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteURL(id) {
    return this.request(`/urls/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Analytics Methods
   */

  async getURLAnalytics(id, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/analytics/urls/${id}${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getDashboardAnalytics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/analytics/dashboard${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Utility Methods
   */

  async testShortURL(shortCode) {
    // Make HEAD request to test redirect without following it
    return this.request(`/${shortCode}`, { method: 'HEAD' });
  }

  // Batch operations
  async createMultipleURLs(urlsData, options = {}) {
    const { concurrent = 5, delay = 100 } = options;
    const results = [];
    const errors = [];

    // Process URLs in batches to respect rate limits
    for (let i = 0; i < urlsData.length; i += concurrent) {
      const batch = urlsData.slice(i, i + concurrent);
      const batchPromises = batch.map(async (urlData, index) => {
        try {
          // Add delay between requests to avoid rate limiting
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * index));
          }
          return await this.createURL(urlData);
        } catch (error) {
          errors.push({ index: i + index, error: error.message, data: urlData });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));
    }

    return { results, errors };
  }
}

/**
 * Usage Examples
 */

async function examples() {
  // Initialize API client
  const api = new URLShortenerAPI({
    baseURL: 'https://api.urlshortener.com',
    accessToken: 'your_access_token_here',
    refreshToken: 'your_refresh_token_here',
    onTokenRefresh: (accessToken, refreshToken) => {
      // Save tokens to persistent storage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  });

  try {
    console.log('🚀 Starting URL Shortener API Examples\n');

    // =======================================================================
    // AUTHENTICATION EXAMPLES
    // =======================================================================

    console.log('📋 Authentication Examples');
    console.log('=' .repeat(50));

    // Example 1: User Registration
    console.log('1. User Registration');
    try {
      const newUser = await api.register({
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        name: 'John Doe',
        organization: 'Acme Corporation'
      });
      console.log('✅ User registered:', newUser.user.email);
      console.log('🔑 Access token received');
    } catch (error) {
      console.log('❌ Registration failed:', error.message);
    }

    // Example 2: User Login
    console.log('\n2. User Login');
    try {
      const loginResult = await api.login({
        email: 'john.doe@example.com',
        password: 'SecurePassword123!'
      });
      console.log('✅ Login successful:', loginResult.user.name);
      console.log('🔑 Tokens updated');
    } catch (error) {
      console.log('❌ Login failed:', error.message);
    }

    // =======================================================================
    // URL MANAGEMENT EXAMPLES
    // =======================================================================

    console.log('\n📋 URL Management Examples');
    console.log('=' .repeat(50));

    // Example 3: Create Basic Short URL
    console.log('3. Create Basic Short URL');
    try {
      const basicURL = await api.createURL({
        originalUrl: 'https://www.example.com/very/long/url/path/that/needs/shortening',
        title: 'Example Website'
      });
      console.log('✅ Short URL created:', basicURL.shortUrl);
      console.log('📊 Clicks:', basicURL.clicks);
    } catch (error) {
      console.log('❌ URL creation failed:', error.message);
    }

    // Example 4: Create Advanced Short URL
    console.log('\n4. Create Advanced Short URL with Custom Slug');
    try {
      const advancedURL = await api.createURL({
        originalUrl: 'https://github.com/awesome-project/repository',
        title: 'Awesome Open Source Project',
        customSlug: 'awesome-repo-2024',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['github', 'open-source', 'development', 'awesome']
      });
      console.log('✅ Advanced short URL created:', advancedURL.shortUrl);
      console.log('🏷️ Tags:', advancedURL.tags.join(', '));
      console.log('⏰ Expires:', new Date(advancedURL.expiresAt).toLocaleDateString());
    } catch (error) {
      console.log('❌ Advanced URL creation failed:', error.message);
    }

    // Example 5: List URLs with Filtering
    console.log('\n5. List URLs with Filtering and Pagination');
    try {
      const urlsList = await api.getURLs({
        page: 1,
        limit: 10,
        search: 'github',
        tag: 'development',
        sortBy: 'clicks',
        sortOrder: 'desc'
      });

      console.log(`✅ Found ${urlsList.pagination.totalItems} URLs`);
      console.log('📊 Top URLs by clicks:');

      urlsList.urls.slice(0, 3).forEach((url, index) => {
        console.log(`   ${index + 1}. ${url.title} - ${url.clicks} clicks`);
        console.log(`      ${url.shortUrl}`);
      });
    } catch (error) {
      console.log('❌ Failed to list URLs:', error.message);
    }

    // Example 6: Update URL
    console.log('\n6. Update URL Details');
    try {
      // Assuming we have a URL ID from previous examples
      const urlId = 123;
      const updatedURL = await api.updateURL(urlId, {
        title: 'Updated Project Title - Now Even More Awesome!',
        tags: ['github', 'open-source', 'development', 'updated', 'awesome'],
        isActive: true
      });
      console.log('✅ URL updated:', updatedURL.title);
      console.log('🏷️ New tags:', updatedURL.tags.join(', '));
    } catch (error) {
      console.log('❌ URL update failed:', error.message);
    }

    // =======================================================================
    // ANALYTICS EXAMPLES
    // =======================================================================

    console.log('\n📋 Analytics Examples');
    console.log('=' .repeat(50));

    // Example 7: URL-Specific Analytics
    console.log('7. URL-Specific Analytics');
    try {
      const urlId = 123;
      const analytics = await api.getURLAnalytics(urlId, {
        period: '30d',
        granularity: 'day'
      });

      console.log('✅ Analytics retrieved:');
      console.log(`📊 Total clicks: ${analytics.summary.totalClicks}`);
      console.log(`👥 Unique clicks: ${analytics.summary.uniqueClicks}`);
      console.log(`📈 Avg clicks/day: ${analytics.summary.averageClicksPerDay.toFixed(1)}`);

      console.log('🌍 Top countries:');
      analytics.geography.slice(0, 3).forEach((geo, index) => {
        console.log(`   ${index + 1}. ${geo.country}: ${geo.clicks} clicks (${geo.percentage}%)`);
      });

      console.log('🔗 Top referrers:');
      analytics.referrers.slice(0, 3).forEach((ref, index) => {
        console.log(`   ${index + 1}. ${ref.referrer}: ${ref.clicks} clicks (${ref.percentage}%)`);
      });

    } catch (error) {
      console.log('❌ Analytics retrieval failed:', error.message);
    }

    // Example 8: Dashboard Analytics
    console.log('\n8. Dashboard Analytics Overview');
    try {
      const dashboard = await api.getDashboardAnalytics({ period: '30d' });

      console.log('✅ Dashboard data retrieved:');
      console.log(`🔗 Total URLs: ${dashboard.summary.totalUrls}`);
      console.log(`📊 Total clicks: ${dashboard.summary.totalClicks.toLocaleString()}`);
      console.log(`👥 Unique clicks: ${dashboard.summary.uniqueClicks.toLocaleString()}`);
      console.log(`📈 Clicks today: ${dashboard.summary.clicksToday}`);

      console.log('🏆 Top performing URLs:');
      dashboard.topUrls.slice(0, 3).forEach((url, index) => {
        console.log(`   ${index + 1}. ${url.title} - ${url.clicks} clicks`);
      });

    } catch (error) {
      console.log('❌ Dashboard analytics failed:', error.message);
    }

    // =======================================================================
    // ADVANCED EXAMPLES
    // =======================================================================

    console.log('\n📋 Advanced Examples');
    console.log('=' .repeat(50));

    // Example 9: Bulk URL Creation
    console.log('9. Bulk URL Creation');
    try {
      const urlsToCreate = [
        {
          originalUrl: 'https://www.example.com/page1',
          title: 'Example Page 1',
          tags: ['bulk', 'example', 'page1']
        },
        {
          originalUrl: 'https://www.example.com/page2',
          title: 'Example Page 2',
          tags: ['bulk', 'example', 'page2']
        },
        {
          originalUrl: 'https://www.example.com/page3',
          title: 'Example Page 3',
          tags: ['bulk', 'example', 'page3']
        }
      ];

      console.log(`Creating ${urlsToCreate.length} URLs...`);
      const bulkResult = await api.createMultipleURLs(urlsToCreate, {
        concurrent: 2, // Process 2 at a time
        delay: 500     // 500ms delay between requests
      });

      console.log(`✅ Successfully created ${bulkResult.results.length} URLs`);
      if (bulkResult.errors.length > 0) {
        console.log(`❌ ${bulkResult.errors.length} errors occurred`);
      }

    } catch (error) {
      console.log('❌ Bulk creation failed:', error.message);
    }

    // Example 10: Rate Limit Monitoring
    console.log('\n10. Rate Limit Monitoring');
    try {
      const result = await api.getURLs({ limit: 1 });
      const rateLimit = result._rateLimit;

      console.log('✅ Rate limit information:');
      console.log(`📊 Limit: ${rateLimit.limit} requests per hour`);
      console.log(`⏳ Remaining: ${rateLimit.remaining} requests`);
      console.log(`🕐 Resets at: ${new Date(rateLimit.reset * 1000).toLocaleTimeString()}`);

      const usagePercentage = ((rateLimit.limit - rateLimit.remaining) / rateLimit.limit * 100).toFixed(1);
      console.log(`📈 Usage: ${usagePercentage}%`);

    } catch (error) {
      console.log('❌ Rate limit check failed:', error.message);
    }

    // =======================================================================
    // ERROR HANDLING EXAMPLES
    // =======================================================================

    console.log('\n📋 Error Handling Examples');
    console.log('=' .repeat(50));

    // Example 11: Handling Different Error Types
    console.log('11. Error Handling Demonstration');

    // Validation Error
    try {
      await api.createURL({
        originalUrl: 'not-a-valid-url',
        title: 'Invalid URL Test'
      });
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        console.log('❌ Validation Error:', error.message);
        if (error.details) {
          error.details.forEach(detail => {
            console.log(`   - ${detail.field}: ${detail.message}`);
          });
        }
      }
    }

    // Rate Limit Error
    try {
      // Simulate rate limit by making many requests quickly
      const promises = Array.from({ length: 10 }, () => api.getURLs({ limit: 1 }));
      await Promise.all(promises);
    } catch (error) {
      if (error.code === 'RATE_LIMITED') {
        console.log('❌ Rate Limited:', error.message);
        console.log(`⏳ Retry after ${error.retryAfter} seconds`);
      }
    }

    // Not Found Error
    try {
      await api.getURL(999999);
    } catch (error) {
      if (error.status === 404) {
        console.log('❌ Not Found:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

/**
 * Utility Functions for Common Tasks
 */

// Token persistence helper
function saveTokens(accessToken, refreshToken) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  } else if (typeof require !== 'undefined') {
    // Node.js environment - save to file
    const fs = require('fs');
    const path = require('path');
    const tokensPath = path.join(process.cwd(), '.tokens.json');

    fs.writeFileSync(tokensPath, JSON.stringify({
      accessToken,
      refreshToken,
      timestamp: Date.now()
    }));
  }
}

function loadTokens() {
  if (typeof localStorage !== 'undefined') {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken')
    };
  } else if (typeof require !== 'undefined') {
    const fs = require('fs');
    const path = require('path');
    const tokensPath = path.join(process.cwd(), '.tokens.json');

    try {
      const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      return tokensData;
    } catch (error) {
      return { accessToken: null, refreshToken: null };
    }
  }
}

// Retry helper for failed requests
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry certain error types
      if (error.status === 400 || error.status === 401 || error.status === 404) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    URLShortenerAPI,
    saveTokens,
    loadTokens,
    withRetry
  };
}

// Run examples if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  examples().catch(console.error);
}

/**
 * React Hook Example
 *
 * For React applications, here's a custom hook for the URL Shortener API:
 */

/*
import { useState, useEffect, useCallback } from 'react';

export function useURLShortener(initialConfig = {}) {
  const [api, setApi] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const tokens = loadTokens();
    const apiInstance = new URLShortenerAPI({
      ...initialConfig,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      onTokenRefresh: (accessToken, refreshToken) => {
        saveTokens(accessToken, refreshToken);
        setIsAuthenticated(!!accessToken);
      }
    });

    setApi(apiInstance);
    setIsAuthenticated(!!tokens.accessToken);
  }, []);

  const login = useCallback(async (credentials) => {
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.login(credentials);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createURL = useCallback(async (urlData) => {
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      return await api.createURL(urlData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    api,
    isAuthenticated,
    loading,
    error,
    login,
    createURL,
    // Add other methods as needed
  };
}
*/

console.log('📚 Enterprise URL Shortener API JavaScript Examples loaded!');
console.log('💡 Run examples() to see the API in action');
console.log('📖 Check the comments for React hooks and additional utilities');