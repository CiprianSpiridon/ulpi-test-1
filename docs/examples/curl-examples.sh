#!/bin/bash

# Enterprise URL Shortener API - cURL Examples
# This script demonstrates various API operations using cURL

# Configuration
API_BASE_URL="https://api.urlshortener.com"
# Replace with your actual tokens
ACCESS_TOKEN="your_access_token_here"
REFRESH_TOKEN="your_refresh_token_here"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to make API request and display response
make_request() {
    local description="$1"
    shift
    print_header "$description"
    echo "Command: $@"
    echo
    "$@" | jq '.' 2>/dev/null || echo "Response received (install jq for formatted JSON)"
    echo
    echo "---"
    echo
}

print_header "Enterprise URL Shortener API - cURL Examples"
print_info "Make sure to replace ACCESS_TOKEN and REFRESH_TOKEN with real values"
echo

# =============================================================================
# AUTHENTICATION EXAMPLES
# =============================================================================

print_header "AUTHENTICATION EXAMPLES"

# User Registration
make_request "1. Register a new user" \
curl -X POST "$API_BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe",
    "organization": "Acme Corporation"
  }'

# User Login
make_request "2. User login" \
curl -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'

# Refresh Token
make_request "3. Refresh access token" \
curl -X POST "$API_BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"

# =============================================================================
# URL MANAGEMENT EXAMPLES
# =============================================================================

print_header "URL MANAGEMENT EXAMPLES"

# Create Short URL (Basic)
make_request "4. Create a basic short URL" \
curl -X POST "$API_BASE_URL/urls" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://www.example.com/very/long/url/path/that/needs/shortening",
    "title": "Example Website"
  }'

# Create Short URL (Advanced with custom slug and expiration)
make_request "5. Create short URL with custom slug and expiration" \
curl -X POST "$API_BASE_URL/urls" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://github.com/awesome-project/repo",
    "title": "Awesome Project Repository",
    "customSlug": "awesome-repo-2024",
    "expiresAt": "2024-12-31T23:59:59Z",
    "tags": ["github", "development", "open-source"]
  }'

# List URLs (Basic)
make_request "6. Get list of URLs (basic)" \
curl -X GET "$API_BASE_URL/urls" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# List URLs (Advanced with filtering and pagination)
make_request "7. Get list of URLs with filtering and sorting" \
curl -X GET "$API_BASE_URL/urls?page=1&limit=10&search=github&tag=development&sortBy=clicks&sortOrder=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get specific URL details
make_request "8. Get specific URL details" \
curl -X GET "$API_BASE_URL/urls/123" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Update URL
make_request "9. Update URL title and tags" \
curl -X PUT "$API_BASE_URL/urls/123" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Project Title",
    "tags": ["github", "development", "updated"],
    "isActive": true
  }'

# Delete URL
make_request "10. Delete URL" \
curl -X DELETE "$API_BASE_URL/urls/123" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# =============================================================================
# REDIRECT EXAMPLES
# =============================================================================

print_header "REDIRECT EXAMPLES"

# Test redirect (this will follow the redirect)
print_info "11. Test URL redirect (follows redirect)"
echo "Command: curl -L $API_BASE_URL/abc123"
curl -L -w "HTTP Status: %{http_code}\nFinal URL: %{url_effective}\nTotal Time: %{time_total}s\n" \
  "$API_BASE_URL/abc123" \
  -o /dev/null -s
echo

# Test redirect headers only
make_request "12. Get redirect headers only (HEAD request)" \
curl -I "$API_BASE_URL/abc123"

# =============================================================================
# ANALYTICS EXAMPLES
# =============================================================================

print_header "ANALYTICS EXAMPLES"

# Get URL-specific analytics
make_request "13. Get URL analytics (30-day period)" \
curl -X GET "$API_BASE_URL/analytics/urls/123?period=30d&granularity=day" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get URL analytics for different periods
make_request "14. Get URL analytics (7-day period with hourly granularity)" \
curl -X GET "$API_BASE_URL/analytics/urls/123?period=7d&granularity=hour" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get dashboard analytics
make_request "15. Get dashboard analytics" \
curl -X GET "$API_BASE_URL/analytics/dashboard?period=30d" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get dashboard analytics for different period
make_request "16. Get dashboard analytics (1-year view)" \
curl -X GET "$API_BASE_URL/analytics/dashboard?period=1y" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# =============================================================================
# ERROR HANDLING EXAMPLES
# =============================================================================

print_header "ERROR HANDLING EXAMPLES"

# Test with invalid token
print_info "17. Example: Invalid token error"
echo "Command: curl with invalid token"
curl -X GET "$API_BASE_URL/urls" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Error response received"
echo

# Test with missing required field
print_info "18. Example: Validation error"
echo "Command: curl with missing required field"
curl -X POST "$API_BASE_URL/urls" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Missing originalUrl field"
  }' | jq '.' 2>/dev/null || echo "Validation error response received"
echo

# Test non-existent URL
print_info "19. Example: URL not found error"
echo "Command: curl for non-existent URL"
curl -X GET "$API_BASE_URL/urls/999999" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.' 2>/dev/null || echo "Not found error response received"
echo

# =============================================================================
# ADVANCED EXAMPLES
# =============================================================================

print_header "ADVANCED EXAMPLES"

# Bulk URL creation (simulated)
print_info "20. Bulk URL creation example"
echo "Creating multiple URLs in sequence..."

URLS=(
  "https://www.example.com/page1"
  "https://www.example.com/page2"
  "https://www.example.com/page3"
)

TITLES=(
  "Example Page 1"
  "Example Page 2"
  "Example Page 3"
)

for i in "${!URLS[@]}"; do
  echo "Creating URL $((i+1))/3..."
  curl -X POST "$API_BASE_URL/urls" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"originalUrl\": \"${URLS[$i]}\",
      \"title\": \"${TITLES[$i]}\",
      \"tags\": [\"bulk\", \"example\"]
    }" \
    -s | jq '.data.shortUrl' 2>/dev/null || echo "URL created"
done

echo

# Rate limit testing
print_info "21. Rate limit demonstration"
echo "Making multiple rapid requests to demonstrate rate limiting..."

for i in {1..5}; do
  echo "Request $i:"
  curl -X GET "$API_BASE_URL/urls?limit=1" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -I -s | grep -E "(HTTP|X-RateLimit)"
  sleep 0.1
done

echo

# =============================================================================
# HEALTH CHECK AND INFORMATION
# =============================================================================

print_header "HEALTH CHECK AND INFORMATION"

# API Health check (if available)
print_info "22. API Health check"
echo "Command: curl $API_BASE_URL/health"
curl -X GET "$API_BASE_URL/health" -s | jq '.' 2>/dev/null || echo "Health check endpoint may not be available"
echo

# Get API information (if available)
print_info "23. API Information"
echo "Command: curl $API_BASE_URL/info"
curl -X GET "$API_BASE_URL/info" -s | jq '.' 2>/dev/null || echo "Info endpoint may not be available"
echo

# =============================================================================
# TIPS AND BEST PRACTICES
# =============================================================================

print_header "TIPS AND BEST PRACTICES"

echo "1. Always check HTTP status codes:"
echo "   curl -w 'Status: %{http_code}' ..."
echo

echo "2. Include proper error handling:"
echo "   if ! response=\$(curl -s ...); then"
echo "     echo 'Request failed'"
echo "   fi"
echo

echo "3. Use environment variables for sensitive data:"
echo "   export ACCESS_TOKEN='your_token'"
echo "   curl -H \"Authorization: Bearer \$ACCESS_TOKEN\" ..."
echo

echo "4. Monitor rate limit headers:"
echo "   curl -I ... | grep 'X-RateLimit'"
echo

echo "5. Use jq for JSON parsing:"
echo "   curl ... | jq '.data.shortUrl'"
echo

echo "6. For production, implement token refresh logic:"
echo "   if [[ \$status -eq 401 ]]; then"
echo "     # Refresh token and retry"
echo "   fi"
echo

print_success "All examples completed!"
print_info "Remember to replace placeholder tokens with real values for actual testing"