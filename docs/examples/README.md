# Enterprise URL Shortener - Code Examples

This directory contains comprehensive code examples for integrating with the Enterprise URL Shortener API using various programming languages and tools.

## 📁 Available Examples

### Programming Languages

- **[curl-examples.sh](./curl-examples.sh)** - Shell script with cURL examples
- **[javascript-examples.js](./javascript-examples.js)** - JavaScript/Node.js examples
- **[python-examples.py](./python-examples.py)** - Python examples with requests library
- **[php-examples.php](./php-examples.php)** - PHP examples with cURL

### Additional Resources

- **[../postman_collection.json](../postman_collection.json)** - Complete Postman collection
- **[../swagger-ui.html](../swagger-ui.html)** - Interactive API documentation

## 🚀 Quick Start

### Prerequisites

Before running the examples, ensure you have:

1. **API Access**: Register for an account and obtain your API credentials
2. **Environment Setup**: Configure your development environment
3. **Dependencies**: Install required libraries for your chosen language

### Environment Variables

For security, use environment variables for sensitive data:

```bash
export API_BASE_URL="https://api.urlshortener.com"
export ACCESS_TOKEN="your_jwt_access_token"
export REFRESH_TOKEN="your_jwt_refresh_token"
```

### Language-Specific Setup

#### cURL (Bash)

```bash
# Make the script executable
chmod +x curl-examples.sh

# Run examples
./curl-examples.sh
```

#### JavaScript/Node.js

```bash
# Install dependencies (if using Node.js)
npm install node-fetch  # for Node.js < 18
# or use built-in fetch for Node.js 18+

# Run examples
node javascript-examples.js
```

#### Python

```bash
# Install dependencies
pip install requests python-dotenv

# Run examples
python python-examples.py
```

#### PHP

```bash
# Ensure cURL extension is installed
php -m | grep curl

# Run examples
php php-examples.php
```

## 📚 Example Categories

### 1. Authentication Examples

All examples include comprehensive authentication handling:

- User registration
- User login with JWT tokens
- Automatic token refresh
- Token storage and management

### 2. URL Management Examples

Complete URL lifecycle management:

- Creating basic short URLs
- Creating URLs with custom slugs and expiration
- Listing URLs with pagination and filtering
- Updating URL details
- Deleting URLs

### 3. Analytics Examples

Comprehensive analytics and reporting:

- URL-specific analytics with various time periods
- Dashboard overview analytics
- Geographic and device analytics
- Click tracking and trends

### 4. Error Handling Examples

Robust error handling patterns:

- Validation errors
- Authentication errors
- Rate limiting
- Not found errors
- Network errors

### 5. Advanced Examples

Production-ready patterns:

- Bulk operations with rate limiting
- Retry mechanisms
- Performance monitoring
- Token management
- Webhook handling

## 🛠️ Integration Patterns

### Basic Integration

For simple use cases, start with basic URL shortening:

```javascript
// Create API client
const api = new URLShortenerAPI({
  baseURL: 'https://api.urlshortener.com',
  accessToken: 'your-token'
});

// Create short URL
const result = await api.createURL('https://example.com', {
  title: 'My Website'
});

console.log('Short URL:', result.shortUrl);
```

### Production Integration

For production applications, implement comprehensive error handling:

```python
import logging
from urllib_shortener_api import URLShortenerAPI, URLShortenerAPIError

# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize client with retry logic
api = URLShortenerAPI(
    base_url='https://api.urlshortener.com',
    access_token=os.getenv('ACCESS_TOKEN'),
    timeout=30
)

try:
    # Create URL with error handling
    result = api.create_url(
        original_url='https://example.com',
        title='Production Website',
        tags=['production', 'website']
    )
    logging.info(f"Created short URL: {result['shortUrl']}")

except URLShortenerAPIError as e:
    logging.error(f"API error: {e.message} (Code: {e.error_code})")
    # Handle specific error types
    if e.status_code == 429:  # Rate limited
        # Implement backoff strategy
        pass
    elif e.error_code == 'VALIDATION_ERROR':
        # Handle validation errors
        pass
```

## 🔧 Configuration Options

### Client Configuration

Most examples support these configuration options:

- **Base URL**: API endpoint URL
- **Timeout**: Request timeout in seconds
- **Retry Logic**: Automatic retry on failures
- **Rate Limiting**: Built-in rate limit handling
- **Token Management**: Automatic token refresh

### Example Configuration

```javascript
const config = {
  baseURL: 'https://api.urlshortener.com',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 3600000
  },
  auth: {
    autoRefresh: true,
    refreshThreshold: 300 // seconds
  }
};
```

## 📊 Testing and Validation

### Running Tests

Each example includes built-in testing capabilities:

```bash
# JavaScript
npm test

# Python
python -m pytest test_examples.py

# PHP
php -f test_examples.php

# cURL
./test-api-endpoints.sh
```

### Validation Checklist

- [ ] Authentication flow works correctly
- [ ] All CRUD operations function properly
- [ ] Error handling responds appropriately
- [ ] Rate limiting is respected
- [ ] Analytics data is accurate
- [ ] Token refresh works automatically

## 🚨 Common Issues and Solutions

### Authentication Issues

**Problem**: "Invalid or expired token"
**Solution**: Ensure tokens are properly stored and refreshed

```javascript
// Check token expiration before requests
if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
  await refreshAccessToken();
}
```

### Rate Limiting

**Problem**: "Too many requests"
**Solution**: Implement exponential backoff

```python
import time
import random

def handle_rate_limit(attempt):
    delay = min(2 ** attempt + random.uniform(0, 1), 60)
    time.sleep(delay)
```

### Network Issues

**Problem**: Connection timeouts or network errors
**Solution**: Implement retry logic with circuit breaker

```javascript
const retryRequest = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * attempt)
      );
    }
  }
};
```

## 🔗 Related Documentation

- **[API Documentation](../README.md)** - Comprehensive API guide
- **[OpenAPI Specification](../openapi.yml)** - Machine-readable API spec
- **[Deployment Guide](../deployment.md)** - Production deployment instructions
- **[Interactive Docs](../swagger-ui.html)** - Try the API in your browser

## 💬 Support and Community

### Getting Help

1. **Documentation**: Check the comprehensive guides first
2. **Examples**: Review similar use cases in the examples
3. **Issues**: Report bugs or request features on GitHub
4. **Support**: Contact our support team for assistance

### Contributing

We welcome contributions to improve these examples:

1. **Bug Fixes**: Fix issues or improve error handling
2. **New Languages**: Add examples for additional programming languages
3. **Use Cases**: Share common integration patterns
4. **Documentation**: Improve comments and explanations

### Code Style Guidelines

- **Clear Comments**: Explain complex logic and API interactions
- **Error Handling**: Include comprehensive error handling examples
- **Security**: Never include real tokens or credentials
- **Best Practices**: Follow language-specific conventions

## 📈 Performance Tips

### Optimization Strategies

1. **Connection Reuse**: Use persistent HTTP connections
2. **Batch Operations**: Group multiple operations when possible
3. **Caching**: Cache frequently accessed data
4. **Async Operations**: Use asynchronous programming patterns

### Example: Optimized Bulk Creation

```javascript
// Efficient bulk URL creation
async function createURLsBatch(urls, batchSize = 5) {
  const results = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const promises = batch.map(url => api.createURL(url.originalUrl, url));

    try {
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
    }

    // Rate limiting delay
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
```

---

**Happy coding!** 🎉

For questions or support, please contact our development team or check the main documentation.