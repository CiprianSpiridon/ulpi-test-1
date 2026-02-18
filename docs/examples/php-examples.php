<?php
/**
 * Enterprise URL Shortener API - PHP Examples
 *
 * This file contains comprehensive examples of how to interact with the
 * Enterprise URL Shortener API using PHP.
 *
 * Requirements:
 * - PHP 7.4 or higher
 * - cURL extension
 * - JSON extension
 *
 * Author: API Documentation Team
 * Version: 1.0.0
 */

declare(strict_types=1);

/**
 * Custom exception for API errors
 */
class URLShortenerAPIException extends Exception
{
    public ?int $statusCode;
    public ?string $errorCode;
    public array $details;

    public function __construct(
        string $message,
        ?int $statusCode = null,
        ?string $errorCode = null,
        array $details = []
    ) {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }
}

/**
 * Enterprise URL Shortener API Client
 *
 * This class provides a comprehensive interface to interact with the
 * URL Shortener API, including authentication, URL management, analytics,
 * and error handling.
 */
class URLShortenerAPI
{
    private string $baseURL;
    private ?string $accessToken;
    private ?string $refreshToken;
    private int $timeout;
    private array $defaultHeaders;
    private $curlHandle;

    public function __construct(
        string $baseURL = 'https://api.urlshortener.com',
        ?string $accessToken = null,
        ?string $refreshToken = null,
        int $timeout = 30
    ) {
        $this->baseURL = rtrim($baseURL, '/');
        $this->accessToken = $accessToken;
        $this->refreshToken = $refreshToken;
        $this->timeout = $timeout;

        $this->defaultHeaders = [
            'Content-Type: application/json',
            'User-Agent: URLShortener-PHP-Client/1.0.0'
        ];
    }

    public function __destruct()
    {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    /**
     * Get request headers with optional authentication
     */
    private function getHeaders(bool $includeAuth = true): array
    {
        $headers = $this->defaultHeaders;

        if ($includeAuth && $this->accessToken) {
            $headers[] = 'Authorization: Bearer ' . $this->accessToken;
        }

        return $headers;
    }

    /**
     * Initialize cURL handle with default options
     */
    private function initializeCurl(): void
    {
        if (!$this->curlHandle) {
            $this->curlHandle = curl_init();
        }

        curl_setopt_array($this->curlHandle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HEADER => false,
            CURLOPT_VERBOSE => false
        ]);
    }

    /**
     * Handle API response and extract data
     */
    private function handleResponse(string $response, array $headers): array
    {
        // Extract rate limit information
        $rateLimitInfo = [
            'limit' => $this->extractHeader($headers, 'X-RateLimit-Limit'),
            'remaining' => $this->extractHeader($headers, 'X-RateLimit-Remaining'),
            'reset' => $this->extractHeader($headers, 'X-RateLimit-Reset')
        ];

        // Parse JSON response
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = ['message' => $response];
        }

        // Get HTTP status code
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);

        // Handle redirects
        if ($httpCode >= 300 && $httpCode < 400) {
            return [
                'status_code' => $httpCode,
                'location' => $this->extractHeader($headers, 'Location'),
                'headers' => $headers
            ];
        }

        // Handle errors
        if ($httpCode >= 400) {
            $errorMessage = $data['message'] ?? "HTTP {$httpCode}";
            $errorCode = $data['error'] ?? null;
            $details = $data['details'] ?? [];

            throw new URLShortenerAPIException(
                $errorMessage,
                $httpCode,
                $errorCode,
                $details
            );
        }

        // Add rate limit info to successful responses
        $result = $data['data'] ?? $data;
        $result['_rate_limit'] = $rateLimitInfo;

        return $result;
    }

    /**
     * Extract header value from response headers
     */
    private function extractHeader(array $headers, string $headerName): ?string
    {
        $headerName = strtolower($headerName);

        foreach ($headers as $header) {
            if (strpos(strtolower($header), $headerName . ':') === 0) {
                return trim(substr($header, strlen($headerName) + 1));
            }
        }

        return null;
    }

    /**
     * Make authenticated API request with automatic token refresh
     */
    public function request(string $method, string $endpoint, array $options = []): array
    {
        $this->initializeCurl();

        $url = $this->baseURL . '/' . ltrim($endpoint, '/');
        $headers = array_merge($this->getHeaders(), $options['headers'] ?? []);

        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers
        ]);

        // Add request body for POST/PUT requests
        if (isset($options['json'])) {
            curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, json_encode($options['json']));
        }

        // Add query parameters
        if (isset($options['params'])) {
            $queryString = http_build_query($options['params']);
            curl_setopt($this->curlHandle, CURLOPT_URL, $url . '?' . $queryString);
        }

        // Capture response headers
        $responseHeaders = [];
        curl_setopt($this->curlHandle, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
            $responseHeaders[] = trim($header);
            return strlen($header);
        });

        $response = curl_exec($this->curlHandle);

        if ($response === false) {
            $error = curl_error($this->curlHandle);
            throw new URLShortenerAPIException("cURL error: {$error}");
        }

        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);

        // Handle token expiration with automatic refresh
        if ($httpCode === 401 && $this->refreshToken) {
            echo "🔄 Access token expired, attempting refresh...\n";
            $this->refreshAccessToken();

            // Retry original request with new token
            $headers = array_merge($this->getHeaders(), $options['headers'] ?? []);
            curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, $headers);

            $response = curl_exec($this->curlHandle);
            if ($response === false) {
                $error = curl_error($this->curlHandle);
                throw new URLShortenerAPIException("cURL error on retry: {$error}");
            }
        }

        return $this->handleResponse($response, $responseHeaders);
    }

    // ==========================================================================
    // Authentication Methods
    // ==========================================================================

    /**
     * Register a new user account
     */
    public function register(string $email, string $password, string $name, ?string $organization = null): array
    {
        $data = [
            'email' => $email,
            'password' => $password,
            'name' => $name
        ];

        if ($organization) {
            $data['organization'] = $organization;
        }

        $response = $this->request('POST', '/auth/register', [
            'json' => $data,
            'headers' => [] // No auth header for registration
        ]);

        // Store tokens
        if (isset($response['tokens'])) {
            $this->accessToken = $response['tokens']['accessToken'];
            $this->refreshToken = $response['tokens']['refreshToken'];
        }

        return $response;
    }

    /**
     * Authenticate user and receive JWT tokens
     */
    public function login(string $email, string $password): array
    {
        $data = [
            'email' => $email,
            'password' => $password
        ];

        $response = $this->request('POST', '/auth/login', [
            'json' => $data,
            'headers' => [] // No auth header for login
        ]);

        // Store tokens
        if (isset($response['tokens'])) {
            $this->accessToken = $response['tokens']['accessToken'];
            $this->refreshToken = $response['tokens']['refreshToken'];
        }

        return $response;
    }

    /**
     * Get new access token using refresh token
     */
    public function refreshAccessToken(): array
    {
        if (!$this->refreshToken) {
            throw new URLShortenerAPIException("No refresh token available");
        }

        $data = ['refreshToken' => $this->refreshToken];

        $response = $this->request('POST', '/auth/refresh', [
            'json' => $data,
            'headers' => [] // No auth header for refresh
        ]);

        // Update access token
        if (isset($response['accessToken'])) {
            $this->accessToken = $response['accessToken'];
        }

        return $response;
    }

    // ==========================================================================
    // URL Management Methods
    // ==========================================================================

    /**
     * Create a new short URL
     */
    public function createURL(string $originalUrl, array $options = []): array
    {
        $data = ['originalUrl' => $originalUrl];

        if (isset($options['title'])) {
            $data['title'] = $options['title'];
        }
        if (isset($options['customSlug'])) {
            $data['customSlug'] = $options['customSlug'];
        }
        if (isset($options['expiresAt'])) {
            $data['expiresAt'] = $options['expiresAt'];
        }
        if (isset($options['tags'])) {
            $data['tags'] = $options['tags'];
        }

        return $this->request('POST', '/urls', ['json' => $data]);
    }

    /**
     * Get paginated list of user's URLs
     */
    public function getURLs(array $params = []): array
    {
        $defaultParams = [
            'page' => 1,
            'limit' => 20,
            'sortBy' => 'createdAt',
            'sortOrder' => 'desc'
        ];

        $params = array_merge($defaultParams, $params);

        return $this->request('GET', '/urls', ['params' => $params]);
    }

    /**
     * Get details for a specific URL
     */
    public function getURL(int $urlId): array
    {
        return $this->request('GET', "/urls/{$urlId}");
    }

    /**
     * Update URL details
     */
    public function updateURL(int $urlId, array $updateData): array
    {
        return $this->request('PUT', "/urls/{$urlId}", ['json' => $updateData]);
    }

    /**
     * Delete a URL
     */
    public function deleteURL(int $urlId): array
    {
        return $this->request('DELETE', "/urls/{$urlId}");
    }

    // ==========================================================================
    // Analytics Methods
    // ==========================================================================

    /**
     * Get analytics for a specific URL
     */
    public function getURLAnalytics(int $urlId, array $params = []): array
    {
        $defaultParams = [
            'period' => '30d',
            'granularity' => 'day'
        ];

        $params = array_merge($defaultParams, $params);

        return $this->request('GET', "/analytics/urls/{$urlId}", ['params' => $params]);
    }

    /**
     * Get dashboard analytics overview
     */
    public function getDashboardAnalytics(array $params = []): array
    {
        $defaultParams = ['period' => '30d'];
        $params = array_merge($defaultParams, $params);

        return $this->request('GET', '/analytics/dashboard', ['params' => $params]);
    }

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    /**
     * Test a short URL without following the redirect
     */
    public function testShortURL(string $shortCode): array
    {
        $this->initializeCurl();

        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => "{$this->baseURL}/{$shortCode}",
            CURLOPT_CUSTOMREQUEST => 'HEAD',
            CURLOPT_NOBODY => true,
            CURLOPT_FOLLOWLOCATION => false
        ]);

        $responseHeaders = [];
        curl_setopt($this->curlHandle, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
            $responseHeaders[] = trim($header);
            return strlen($header);
        });

        curl_exec($this->curlHandle);
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);

        return [
            'status_code' => $httpCode,
            'location' => $this->extractHeader($responseHeaders, 'Location'),
            'headers' => $responseHeaders
        ];
    }

    /**
     * Create multiple URLs with rate limit consideration
     */
    public function createMultipleURLs(array $urlsData, int $maxConcurrent = 5, float $delayBetween = 0.5): array
    {
        $results = [];
        $errors = [];

        foreach (array_chunk($urlsData, $maxConcurrent, true) as $batch) {
            foreach ($batch as $index => $urlData) {
                try {
                    // Add delay between requests
                    if ($delayBetween > 0 && count($results) > 0) {
                        usleep((int)($delayBetween * 1000000)); // Convert to microseconds
                    }

                    $result = $this->createURL($urlData['originalUrl'], $urlData);
                    $results[] = $result;

                } catch (URLShortenerAPIException $e) {
                    $errors[] = [
                        'index' => $index,
                        'error' => $e->getMessage(),
                        'data' => $urlData
                    ];
                }
            }
        }

        return [
            'results' => $results,
            'errors' => $errors,
            'total_processed' => count($urlsData),
            'success_count' => count($results),
            'error_count' => count($errors)
        ];
    }

    /**
     * Save tokens to file
     */
    public function saveTokens(string $filePath = '.tokens.json'): void
    {
        $tokenData = [
            'access_token' => $this->accessToken,
            'refresh_token' => $this->refreshToken,
            'timestamp' => date('c')
        ];

        file_put_contents($filePath, json_encode($tokenData, JSON_PRETTY_PRINT));
        echo "🔑 Tokens saved to {$filePath}\n";
    }

    /**
     * Load tokens from file
     */
    public function loadTokens(string $filePath = '.tokens.json'): bool
    {
        if (!file_exists($filePath)) {
            echo "⚠️  Token file {$filePath} not found\n";
            return false;
        }

        $tokenData = json_decode(file_get_contents($filePath), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo "❌ Invalid JSON in token file {$filePath}\n";
            return false;
        }

        $this->accessToken = $tokenData['access_token'] ?? null;
        $this->refreshToken = $tokenData['refresh_token'] ?? null;

        echo "🔑 Tokens loaded from {$filePath}\n";
        return true;
    }

    // Getters and Setters
    public function getAccessToken(): ?string { return $this->accessToken; }
    public function getRefreshToken(): ?string { return $this->refreshToken; }
    public function setAccessToken(?string $token): void { $this->accessToken = $token; }
    public function setRefreshToken(?string $token): void { $this->refreshToken = $token; }
}

/**
 * Retry decorator for failed API calls
 */
function withRetry(callable $func, int $maxRetries = 3, float $delay = 1.0, float $backoffFactor = 2.0): callable
{
    return function(...$args) use ($func, $maxRetries, $delay, $backoffFactor) {
        $lastException = null;
        $currentDelay = $delay;

        for ($attempt = 0; $attempt <= $maxRetries; $attempt++) {
            try {
                return $func(...$args);
            } catch (URLShortenerAPIException $e) {
                $lastException = $e;

                // Don't retry certain error types
                if (in_array($e->statusCode, [400, 401, 404])) {
                    throw $e;
                }

                if ($attempt < $maxRetries) {
                    echo "⚠️  Attempt " . ($attempt + 1) . " failed: {$e->getMessage()}. Retrying in {$currentDelay}s...\n";
                    usleep((int)($currentDelay * 1000000)); // Convert to microseconds
                    $currentDelay *= $backoffFactor;
                }
            }
        }

        throw $lastException;
    };
}

// =============================================================================
// EXAMPLES AND DEMONSTRATIONS
// =============================================================================

function main(): void
{
    echo "🚀 Enterprise URL Shortener API - PHP Examples\n";
    echo str_repeat("=", 60) . "\n";

    // Initialize API client
    $api = new URLShortenerAPI(
        baseURL: $_ENV['API_BASE_URL'] ?? 'https://api.urlshortener.com',
        accessToken: $_ENV['ACCESS_TOKEN'] ?? null,
        refreshToken: $_ENV['REFRESH_TOKEN'] ?? null
    );

    // Try to load tokens from file
    if (!$api->getAccessToken()) {
        $api->loadTokens();
    }

    try {
        // =======================================================================
        // Authentication Examples
        // =======================================================================

        echo "\n📋 Authentication Examples\n";
        echo str_repeat("-", 40) . "\n";

        if (!$api->getAccessToken()) {
            echo "1. User Registration Example\n";
            try {
                $registrationResult = $api->register(
                    email: "john.doe@example.com",
                    password: "SecurePassword123!",
                    name: "John Doe",
                    organization: "Acme Corporation"
                );
                echo "✅ User registered: {$registrationResult['user']['email']}\n";
                echo "🔑 Tokens obtained and stored\n";
                $api->saveTokens();

            } catch (URLShortenerAPIException $e) {
                echo "❌ Registration failed: {$e->getMessage()}\n";

                // Try login instead
                echo "\n2. User Login Example\n";
                try {
                    $loginResult = $api->login(
                        email: "john.doe@example.com",
                        password: "SecurePassword123!"
                    );
                    echo "✅ Login successful: {$loginResult['user']['name']}\n";
                    $api->saveTokens();

                } catch (URLShortenerAPIException $e) {
                    echo "❌ Login failed: {$e->getMessage()}\n";
                    echo "⚠️  Please set ACCESS_TOKEN environment variable\n";
                    return;
                }
            }
        } else {
            echo "✅ Using existing authentication tokens\n";
        }

        // =======================================================================
        // URL Management Examples
        // =======================================================================

        echo "\n📋 URL Management Examples\n";
        echo str_repeat("-", 40) . "\n";

        // Example 3: Create basic short URL
        echo "3. Creating Basic Short URL\n";
        try {
            $basicUrl = $api->createURL(
                originalUrl: "https://www.example.com/very/long/url/path/that/needs/shortening",
                options: ['title' => 'Example Website Demo']
            );
            echo "✅ Short URL created: {$basicUrl['shortUrl']}\n";
            echo "📊 Initial clicks: {$basicUrl['clicks']}\n";

        } catch (URLShortenerAPIException $e) {
            echo "❌ URL creation failed: {$e->getMessage()}\n";
        }

        // Example 4: Create advanced short URL
        echo "\n4. Creating Advanced Short URL\n";
        try {
            $expiresAt = (new DateTime('+1 year'))->format('c');
            $advancedUrl = $api->createURL(
                originalUrl: "https://github.com/awesome-project/repository",
                options: [
                    'title' => 'Awesome Open Source Project',
                    'customSlug' => 'awesome-repo-2024',
                    'expiresAt' => $expiresAt,
                    'tags' => ['github', 'open-source', 'development', 'awesome']
                ]
            );
            echo "✅ Advanced short URL created: {$advancedUrl['shortUrl']}\n";
            echo "🏷️  Tags: " . implode(', ', $advancedUrl['tags']) . "\n";
            echo "⏰ Expires: " . (new DateTime($expiresAt))->format('Y-m-d') . "\n";

        } catch (URLShortenerAPIException $e) {
            echo "❌ Advanced URL creation failed: {$e->getMessage()}\n";
            if ($e->errorCode === 'SLUG_EXISTS') {
                echo "💡 Try a different custom slug\n";
            }
        }

        // Example 5: List URLs with filtering
        echo "\n5. Listing URLs with Filtering\n";
        try {
            $urlsResponse = $api->getURLs([
                'page' => 1,
                'limit' => 10,
                'search' => 'github',
                'tag' => 'development',
                'sortBy' => 'clicks',
                'sortOrder' => 'desc'
            ]);

            $urlsList = $urlsResponse['urls'];
            $pagination = $urlsResponse['pagination'];

            echo "✅ Found {$pagination['totalItems']} URLs\n";
            echo "📊 Top URLs by clicks:\n";

            foreach (array_slice($urlsList, 0, 3) as $i => $url) {
                $num = $i + 1;
                echo "   {$num}. {$url['title']} - {$url['clicks']} clicks\n";
                echo "      {$url['shortUrl']}\n";
            }

        } catch (URLShortenerAPIException $e) {
            echo "❌ Failed to list URLs: {$e->getMessage()}\n";
        }

        // Example 6: Update URL
        echo "\n6. Updating URL Details\n";
        try {
            // Get first URL to update
            $urlsResponse = $api->getURLs(['limit' => 1]);
            if (!empty($urlsResponse['urls'])) {
                $urlToUpdate = $urlsResponse['urls'][0];
                $urlId = $urlToUpdate['id'];

                $updatedUrl = $api->updateURL($urlId, [
                    'title' => 'Updated Title - Now Even More Awesome!',
                    'tags' => ['updated', 'awesome', 'demo'],
                    'isActive' => true
                ]);
                echo "✅ URL updated: {$updatedUrl['title']}\n";
                echo "🏷️  New tags: " . implode(', ', $updatedUrl['tags']) . "\n";
            } else {
                echo "ℹ️  No URLs available to update\n";
            }

        } catch (URLShortenerAPIException $e) {
            echo "❌ URL update failed: {$e->getMessage()}\n";
        }

        // =======================================================================
        // Analytics Examples
        // =======================================================================

        echo "\n📋 Analytics Examples\n";
        echo str_repeat("-", 40) . "\n";

        // Example 7: URL-specific analytics
        echo "7. URL-Specific Analytics\n";
        try {
            $urlsResponse = $api->getURLs(['limit' => 1]);
            if (!empty($urlsResponse['urls'])) {
                $urlId = $urlsResponse['urls'][0]['id'];

                $analytics = $api->getURLAnalytics($urlId, [
                    'period' => '30d',
                    'granularity' => 'day'
                ]);

                echo "✅ Analytics retrieved:\n";
                echo "📊 Total clicks: {$analytics['summary']['totalClicks']}\n";
                echo "👥 Unique clicks: {$analytics['summary']['uniqueClicks']}\n";
                echo "📈 Avg clicks/day: " . number_format($analytics['summary']['averageClicksPerDay'], 1) . "\n";

                if (!empty($analytics['geography'])) {
                    echo "🌍 Top countries:\n";
                    foreach (array_slice($analytics['geography'], 0, 3) as $i => $geo) {
                        $num = $i + 1;
                        echo "   {$num}. {$geo['country']}: {$geo['clicks']} clicks ({$geo['percentage']}%)\n";
                    }
                }

                if (!empty($analytics['referrers'])) {
                    echo "🔗 Top referrers:\n";
                    foreach (array_slice($analytics['referrers'], 0, 3) as $i => $ref) {
                        $num = $i + 1;
                        echo "   {$num}. {$ref['referrer']}: {$ref['clicks']} clicks ({$ref['percentage']}%)\n";
                    }
                }
            } else {
                echo "ℹ️  No URLs available for analytics\n";
            }

        } catch (URLShortenerAPIException $e) {
            echo "❌ Analytics retrieval failed: {$e->getMessage()}\n";
        }

        // Example 8: Dashboard analytics
        echo "\n8. Dashboard Analytics Overview\n";
        try {
            $dashboard = $api->getDashboardAnalytics(['period' => '30d']);

            $summary = $dashboard['summary'];
            echo "✅ Dashboard data retrieved:\n";
            echo "🔗 Total URLs: {$summary['totalUrls']}\n";
            echo "📊 Total clicks: " . number_format($summary['totalClicks']) . "\n";
            echo "👥 Unique clicks: " . number_format($summary['uniqueClicks']) . "\n";
            echo "📈 Clicks today: {$summary['clicksToday']}\n";

            if (!empty($dashboard['topUrls'])) {
                echo "🏆 Top performing URLs:\n";
                foreach (array_slice($dashboard['topUrls'], 0, 3) as $i => $url) {
                    $num = $i + 1;
                    echo "   {$num}. {$url['title']} - {$url['clicks']} clicks\n";
                }
            }

        } catch (URLShortenerAPIException $e) {
            echo "❌ Dashboard analytics failed: {$e->getMessage()}\n";
        }

        // =======================================================================
        // Advanced Examples
        // =======================================================================

        echo "\n📋 Advanced Examples\n";
        echo str_repeat("-", 40) . "\n";

        // Example 9: Bulk URL creation
        echo "9. Bulk URL Creation\n";
        try {
            $urlsToCreate = [
                [
                    'originalUrl' => 'https://www.example.com/page1',
                    'title' => 'Example Page 1',
                    'tags' => ['bulk', 'example', 'page1']
                ],
                [
                    'originalUrl' => 'https://www.example.com/page2',
                    'title' => 'Example Page 2',
                    'tags' => ['bulk', 'example', 'page2']
                ],
                [
                    'originalUrl' => 'https://www.example.com/page3',
                    'title' => 'Example Page 3',
                    'tags' => ['bulk', 'example', 'page3']
                ]
            ];

            echo "Creating " . count($urlsToCreate) . " URLs...\n";
            $bulkResult = $api->createMultipleURLs(
                urlsData: $urlsToCreate,
                maxConcurrent: 2,
                delayBetween: 0.5
            );

            echo "✅ Successfully created {$bulkResult['success_count']} URLs\n";
            if ($bulkResult['error_count'] > 0) {
                echo "❌ {$bulkResult['error_count']} errors occurred\n";
                foreach (array_slice($bulkResult['errors'], 0, 3) as $error) {
                    echo "   - {$error['error']}\n";
                }
            }

        } catch (URLShortenerAPIException $e) {
            echo "❌ Bulk creation failed: {$e->getMessage()}\n";
        }

        // Example 10: Rate limit monitoring
        echo "\n10. Rate Limit Monitoring\n";
        try {
            $result = $api->getURLs(['limit' => 1]);
            $rateLimit = $result['_rate_limit'] ?? [];

            if (!empty($rateLimit['limit'])) {
                $limit = (int)$rateLimit['limit'];
                $remaining = (int)$rateLimit['remaining'];
                $resetTime = date('H:i:s', (int)$rateLimit['reset']);

                echo "✅ Rate limit information:\n";
                echo "📊 Limit: {$limit} requests per hour\n";
                echo "⏳ Remaining: {$remaining} requests\n";
                echo "🕐 Resets at: {$resetTime}\n";

                $usagePercentage = round((($limit - $remaining) / $limit * 100), 1);
                echo "📈 Usage: {$usagePercentage}%\n";
            } else {
                echo "ℹ️  Rate limit information not available\n";
            }

        } catch (URLShortenerAPIException $e) {
            echo "❌ Rate limit check failed: {$e->getMessage()}\n";
        }

        // =======================================================================
        // Error Handling Examples
        // =======================================================================

        echo "\n📋 Error Handling Examples\n";
        echo str_repeat("-", 40) . "\n";

        echo "11. Error Handling Demonstration\n";

        // Validation Error Example
        echo "\n   Validation Error:\n";
        try {
            $api->createURL(
                originalUrl: "not-a-valid-url",
                options: ['title' => 'Invalid URL Test']
            );
        } catch (URLShortenerAPIException $e) {
            if ($e->errorCode === 'VALIDATION_ERROR') {
                echo "   ❌ Validation Error: {$e->getMessage()}\n";
                if (!empty($e->details)) {
                    foreach ($e->details as $detail) {
                        echo "      - {$detail['field']}: {$detail['message']}\n";
                    }
                }
            }
        }

        // Not Found Error Example
        echo "\n   Not Found Error:\n";
        try {
            $api->getURL(999999);
        } catch (URLShortenerAPIException $e) {
            if ($e->statusCode === 404) {
                echo "   ❌ Not Found: {$e->getMessage()}\n";
            }
        }

        echo "\n✅ All examples completed successfully!\n";
        echo "💡 Check the code comments for more usage patterns\n";

    } catch (Exception $e) {
        echo "\n❌ Unexpected error: {$e->getMessage()}\n";
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create API client using environment variables
 */
function createClientFromEnv(): URLShortenerAPI
{
    return new URLShortenerAPI(
        baseURL: $_ENV['API_BASE_URL'] ?? 'https://api.urlshortener.com',
        accessToken: $_ENV['ACCESS_TOKEN'] ?? null,
        refreshToken: $_ENV['REFRESH_TOKEN'] ?? null
    );
}

/**
 * Export all URLs to CSV file
 */
function exportUrlsToCSV(URLShortenerAPI $api, string $filename = 'urls_export.csv'): void
{
    echo "Exporting URLs to {$filename}...\n";

    $allUrls = [];
    $page = 1;

    while (true) {
        try {
            $response = $api->getURLs(['page' => $page, 'limit' => 100]);
            $urls = $response['urls'];

            if (empty($urls)) {
                break;
            }

            $allUrls = array_merge($allUrls, $urls);

            if (!$response['pagination']['hasNext']) {
                break;
            }

            $page++;

        } catch (URLShortenerAPIException $e) {
            echo "Error fetching page {$page}: {$e->getMessage()}\n";
            break;
        }
    }

    // Write to CSV
    if (!empty($allUrls)) {
        $fp = fopen($filename, 'w');

        // Write header
        $headers = ['id', 'title', 'originalUrl', 'shortUrl', 'shortCode', 'clicks', 'isActive', 'createdAt', 'tags'];
        fputcsv($fp, $headers);

        // Write data
        foreach ($allUrls as $url) {
            $row = [
                $url['id'] ?? '',
                $url['title'] ?? '',
                $url['originalUrl'] ?? '',
                $url['shortUrl'] ?? '',
                $url['shortCode'] ?? '',
                $url['clicks'] ?? 0,
                $url['isActive'] ? 'true' : 'false',
                $url['createdAt'] ?? '',
                implode(', ', $url['tags'] ?? [])
            ];
            fputcsv($fp, $row);
        }

        fclose($fp);
    }

    echo "✅ Exported " . count($allUrls) . " URLs to {$filename}\n";
}

/**
 * Create URL with automatic retry on failure
 */
function createUrlWithRetry(URLShortenerAPI $api, string $originalUrl, array $options = []): array
{
    $retryFunction = withRetry(
        function() use ($api, $originalUrl, $options) {
            return $api->createURL($originalUrl, $options);
        },
        maxRetries: 3,
        delay: 1.0
    );

    return $retryFunction();
}

/**
 * Monitor URL click performance over time
 */
function monitorUrlPerformance(URLShortenerAPI $api, int $urlId, int $durationMinutes = 60): void
{
    echo "Monitoring URL {$urlId} for {$durationMinutes} minutes...\n";

    $startTime = time();
    $endTime = $startTime + ($durationMinutes * 60);

    $previousClicks = 0;

    while (time() < $endTime) {
        try {
            $urlData = $api->getURL($urlId);
            $currentClicks = $urlData['clicks'];

            if ($currentClicks > $previousClicks) {
                $newClicks = $currentClicks - $previousClicks;
                echo "🔔 {$newClicks} new clicks! Total: {$currentClicks}\n";
                $previousClicks = $currentClicks;
            }

            sleep(60); // Check every minute

        } catch (URLShortenerAPIException $e) {
            echo "❌ Monitoring error: {$e->getMessage()}\n";
            break;
        }
    }

    echo "✅ Monitoring completed\n";
}

// Run examples if this file is executed directly
if (php_sapi_name() === 'cli' && isset($argv[0]) && realpath($argv[0]) === __FILE__) {
    main();
}

echo "📚 Enterprise URL Shortener API PHP Examples loaded!\n";
echo "💡 Run main() to see the API in action\n";
echo "📖 Check the function comments for additional utilities\n";

?>