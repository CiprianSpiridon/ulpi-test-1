"""
Enterprise URL Shortener API - Python Examples

This module contains comprehensive examples of how to interact with the
Enterprise URL Shortener API using Python.

Requirements:
    pip install requests python-dotenv

Author: API Documentation Team
Version: 1.0.0
"""

import requests
import json
import time
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from urllib.parse import urljoin
from dataclasses import dataclass, asdict
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class TokenResponse:
    """Token response data structure"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None

@dataclass
class URLData:
    """URL creation data structure"""
    original_url: str
    title: Optional[str] = None
    custom_slug: Optional[str] = None
    expires_at: Optional[str] = None
    tags: Optional[List[str]] = None

class URLShortenerAPIError(Exception):
    """Custom exception for API errors"""

    def __init__(self, message: str, status_code: Optional[int] = None,
                 error_code: Optional[str] = None, details: Optional[List[Dict]] = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or []

class URLShortenerAPI:
    """
    Enterprise URL Shortener API Client

    This class provides a comprehensive interface to interact with the
    URL Shortener API, including authentication, URL management, analytics,
    and error handling.
    """

    def __init__(self, base_url: str = "https://api.urlshortener.com",
                 access_token: Optional[str] = None,
                 refresh_token: Optional[str] = None,
                 timeout: int = 30):
        """
        Initialize the API client

        Args:
            base_url: Base URL for the API
            access_token: JWT access token
            refresh_token: JWT refresh token
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.timeout = timeout

        # Create a session for connection reuse
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'URLShortener-Python-Client/1.0.0'
        })

    def _get_headers(self, include_auth: bool = True) -> Dict[str, str]:
        """Get request headers with optional authentication"""
        headers = {}
        if include_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers

    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and extract data"""

        # Log rate limit information
        rate_limit_info = {
            'limit': response.headers.get('X-RateLimit-Limit'),
            'remaining': response.headers.get('X-RateLimit-Remaining'),
            'reset': response.headers.get('X-RateLimit-Reset')
        }

        if any(rate_limit_info.values()):
            logger.debug(f"Rate limit info: {rate_limit_info}")

        # Handle redirects (for short URL testing)
        if response.status_code in [301, 302, 307, 308]:
            return {
                'status_code': response.status_code,
                'location': response.headers.get('location'),
                'headers': dict(response.headers)
            }

        # Parse JSON response
        try:
            data = response.json()
        except json.JSONDecodeError:
            data = {'message': response.text}

        # Handle errors
        if not response.ok:
            error_message = data.get('message', f'HTTP {response.status_code}')
            error_code = data.get('error')
            details = data.get('details', [])

            raise URLShortenerAPIError(
                message=error_message,
                status_code=response.status_code,
                error_code=error_code,
                details=details
            )

        # Add rate limit info to successful responses
        result = data.get('data', data)
        result['_rate_limit'] = rate_limit_info

        return result

    def request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make authenticated API request with automatic token refresh

        Args:
            method: HTTP method
            endpoint: API endpoint
            **kwargs: Additional request parameters

        Returns:
            Response data

        Raises:
            URLShortenerAPIError: For API errors
        """
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        headers = {**self._get_headers(), **kwargs.pop('headers', {})}

        # Add timeout if not specified
        kwargs.setdefault('timeout', self.timeout)

        try:
            response = self.session.request(method, url, headers=headers, **kwargs)

            # Handle token expiration with automatic refresh
            if response.status_code == 401 and self.refresh_token:
                logger.info("Access token expired, attempting refresh...")
                self.refresh_access_token()

                # Retry original request with new token
                headers['Authorization'] = f'Bearer {self.access_token}'
                response = self.session.request(method, url, headers=headers, **kwargs)

            return self._handle_response(response)

        except requests.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise URLShortenerAPIError(f"Request failed: {e}")

    # ==========================================================================
    # Authentication Methods
    # ==========================================================================

    def register(self, email: str, password: str, name: str,
                 organization: Optional[str] = None) -> Dict[str, Any]:
        """
        Register a new user account

        Args:
            email: User email address
            password: User password
            name: User full name
            organization: Optional organization name

        Returns:
            Registration response with user data and tokens
        """
        data = {
            'email': email,
            'password': password,
            'name': name
        }

        if organization:
            data['organization'] = organization

        response = self.request('POST', '/auth/register',
                               json=data, headers={'Authorization': ''})

        # Store tokens
        if 'tokens' in response:
            self.access_token = response['tokens']['accessToken']
            self.refresh_token = response['tokens']['refreshToken']

        return response

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user and receive JWT tokens

        Args:
            email: User email
            password: User password

        Returns:
            Login response with user data and tokens
        """
        data = {
            'email': email,
            'password': password
        }

        response = self.request('POST', '/auth/login',
                               json=data, headers={'Authorization': ''})

        # Store tokens
        if 'tokens' in response:
            self.access_token = response['tokens']['accessToken']
            self.refresh_token = response['tokens']['refreshToken']

        return response

    def refresh_access_token(self) -> Dict[str, Any]:
        """
        Get new access token using refresh token

        Returns:
            New token data

        Raises:
            URLShortenerAPIError: If refresh token is invalid or missing
        """
        if not self.refresh_token:
            raise URLShortenerAPIError("No refresh token available")

        data = {'refreshToken': self.refresh_token}

        response = self.request('POST', '/auth/refresh',
                               json=data, headers={'Authorization': ''})

        # Update access token
        if 'accessToken' in response:
            self.access_token = response['accessToken']

        return response

    # ==========================================================================
    # URL Management Methods
    # ==========================================================================

    def create_url(self, original_url: str, title: Optional[str] = None,
                   custom_slug: Optional[str] = None, expires_at: Optional[datetime] = None,
                   tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Create a new short URL

        Args:
            original_url: The URL to shorten
            title: Optional title for the URL
            custom_slug: Optional custom short code
            expires_at: Optional expiration date
            tags: Optional list of tags

        Returns:
            Created URL data
        """
        data = {'originalUrl': original_url}

        if title:
            data['title'] = title
        if custom_slug:
            data['customSlug'] = custom_slug
        if expires_at:
            data['expiresAt'] = expires_at.isoformat()
        if tags:
            data['tags'] = tags

        return self.request('POST', '/urls', json=data)

    def get_urls(self, page: int = 1, limit: int = 20, search: Optional[str] = None,
                 tag: Optional[str] = None, sort_by: str = 'createdAt',
                 sort_order: str = 'desc') -> Dict[str, Any]:
        """
        Get paginated list of user's URLs

        Args:
            page: Page number (1-based)
            limit: Items per page
            search: Search term for title/URL
            tag: Filter by tag
            sort_by: Sort field
            sort_order: Sort order (asc/desc)

        Returns:
            Paginated URL list
        """
        params = {
            'page': page,
            'limit': limit,
            'sortBy': sort_by,
            'sortOrder': sort_order
        }

        if search:
            params['search'] = search
        if tag:
            params['tag'] = tag

        return self.request('GET', '/urls', params=params)

    def get_url(self, url_id: int) -> Dict[str, Any]:
        """
        Get details for a specific URL

        Args:
            url_id: URL ID

        Returns:
            URL details
        """
        return self.request('GET', f'/urls/{url_id}')

    def update_url(self, url_id: int, title: Optional[str] = None,
                   tags: Optional[List[str]] = None, expires_at: Optional[datetime] = None,
                   is_active: Optional[bool] = None) -> Dict[str, Any]:
        """
        Update URL details

        Args:
            url_id: URL ID
            title: New title
            tags: New tags
            expires_at: New expiration date
            is_active: Active status

        Returns:
            Updated URL data
        """
        data = {}

        if title is not None:
            data['title'] = title
        if tags is not None:
            data['tags'] = tags
        if expires_at is not None:
            data['expiresAt'] = expires_at.isoformat()
        if is_active is not None:
            data['isActive'] = is_active

        return self.request('PUT', f'/urls/{url_id}', json=data)

    def delete_url(self, url_id: int) -> Dict[str, Any]:
        """
        Delete a URL

        Args:
            url_id: URL ID to delete

        Returns:
            Deletion confirmation
        """
        return self.request('DELETE', f'/urls/{url_id}')

    # ==========================================================================
    # Analytics Methods
    # ==========================================================================

    def get_url_analytics(self, url_id: int, period: str = '30d',
                          granularity: str = 'day') -> Dict[str, Any]:
        """
        Get analytics for a specific URL

        Args:
            url_id: URL ID
            period: Time period (24h, 7d, 30d, 90d, 1y)
            granularity: Data granularity (hour, day, week, month)

        Returns:
            URL analytics data
        """
        params = {
            'period': period,
            'granularity': granularity
        }

        return self.request('GET', f'/analytics/urls/{url_id}', params=params)

    def get_dashboard_analytics(self, period: str = '30d') -> Dict[str, Any]:
        """
        Get dashboard analytics overview

        Args:
            period: Time period (24h, 7d, 30d, 90d, 1y)

        Returns:
            Dashboard analytics data
        """
        params = {'period': period}
        return self.request('GET', '/analytics/dashboard', params=params)

    # ==========================================================================
    # Utility Methods
    # ==========================================================================

    def test_short_url(self, short_code: str) -> Dict[str, Any]:
        """
        Test a short URL without following the redirect

        Args:
            short_code: The short code to test

        Returns:
            Redirect information
        """
        # Use HEAD request to get headers without body
        response = self.session.head(
            f"{self.base_url}/{short_code}",
            allow_redirects=False,
            timeout=self.timeout
        )

        return {
            'status_code': response.status_code,
            'location': response.headers.get('location'),
            'headers': dict(response.headers)
        }

    def create_multiple_urls(self, urls_data: List[URLData],
                            max_concurrent: int = 5, delay_between: float = 0.5) -> Dict[str, Any]:
        """
        Create multiple URLs with rate limit consideration

        Args:
            urls_data: List of URLData objects
            max_concurrent: Maximum concurrent requests
            delay_between: Delay between requests in seconds

        Returns:
            Results and errors summary
        """
        results = []
        errors = []

        for i in range(0, len(urls_data), max_concurrent):
            batch = urls_data[i:i + max_concurrent]

            for j, url_data in enumerate(batch):
                try:
                    # Add delay between requests
                    if delay_between > 0 and (i + j) > 0:
                        time.sleep(delay_between)

                    result = self.create_url(
                        original_url=url_data.original_url,
                        title=url_data.title,
                        custom_slug=url_data.custom_slug,
                        expires_at=url_data.expires_at,
                        tags=url_data.tags
                    )
                    results.append(result)

                except URLShortenerAPIError as e:
                    errors.append({
                        'index': i + j,
                        'error': str(e),
                        'data': asdict(url_data)
                    })

        return {
            'results': results,
            'errors': errors,
            'total_processed': len(urls_data),
            'success_count': len(results),
            'error_count': len(errors)
        }

    def save_tokens(self, file_path: str = '.tokens.json') -> None:
        """Save tokens to file"""
        token_data = {
            'access_token': self.access_token,
            'refresh_token': self.refresh_token,
            'timestamp': datetime.now().isoformat()
        }

        with open(file_path, 'w') as f:
            json.dump(token_data, f, indent=2)

        logger.info(f"Tokens saved to {file_path}")

    def load_tokens(self, file_path: str = '.tokens.json') -> bool:
        """
        Load tokens from file

        Returns:
            True if tokens were loaded successfully
        """
        try:
            with open(file_path, 'r') as f:
                token_data = json.load(f)

            self.access_token = token_data.get('access_token')
            self.refresh_token = token_data.get('refresh_token')

            logger.info(f"Tokens loaded from {file_path}")
            return True

        except FileNotFoundError:
            logger.warning(f"Token file {file_path} not found")
            return False
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in token file {file_path}")
            return False


def retry_on_failure(max_retries: int = 3, delay: float = 1.0,
                     backoff_factor: float = 2.0):
    """
    Decorator for retrying failed API calls

    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries
        backoff_factor: Multiplier for delay after each retry
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except URLShortenerAPIError as e:
                    last_exception = e

                    # Don't retry certain error types
                    if e.status_code in [400, 401, 404]:
                        raise e

                    if attempt < max_retries:
                        logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {current_delay}s...")
                        time.sleep(current_delay)
                        current_delay *= backoff_factor

            raise last_exception

        return wrapper
    return decorator


# =============================================================================
# EXAMPLES AND DEMONSTRATIONS
# =============================================================================

def main():
    """Main function demonstrating API usage"""

    print("🚀 Enterprise URL Shortener API - Python Examples")
    print("=" * 60)

    # Initialize API client
    api = URLShortenerAPI(
        base_url='https://api.urlshortener.com',
        access_token=os.getenv('ACCESS_TOKEN'),
        refresh_token=os.getenv('REFRESH_TOKEN')
    )

    # Try to load tokens from file
    if not api.access_token:
        api.load_tokens()

    try:
        # =======================================================================
        # Authentication Examples
        # =======================================================================

        print("\n📋 Authentication Examples")
        print("-" * 40)

        if not api.access_token:
            print("1. User Registration Example")
            try:
                registration_result = api.register(
                    email="john.doe@example.com",
                    password="SecurePassword123!",
                    name="John Doe",
                    organization="Acme Corporation"
                )
                print(f"✅ User registered: {registration_result['user']['email']}")
                print("🔑 Tokens obtained and stored")
                api.save_tokens()

            except URLShortenerAPIError as e:
                print(f"❌ Registration failed: {e}")

                # Try login instead
                print("\n2. User Login Example")
                try:
                    login_result = api.login(
                        email="john.doe@example.com",
                        password="SecurePassword123!"
                    )
                    print(f"✅ Login successful: {login_result['user']['name']}")
                    api.save_tokens()

                except URLShortenerAPIError as e:
                    print(f"❌ Login failed: {e}")
                    print("⚠️  Please set ACCESS_TOKEN environment variable")
                    return
        else:
            print("✅ Using existing authentication tokens")

        # =======================================================================
        # URL Management Examples
        # =======================================================================

        print("\n📋 URL Management Examples")
        print("-" * 40)

        # Example 3: Create basic short URL
        print("3. Creating Basic Short URL")
        try:
            basic_url = api.create_url(
                original_url="https://www.example.com/very/long/url/path/that/needs/shortening",
                title="Example Website Demo"
            )
            print(f"✅ Short URL created: {basic_url['shortUrl']}")
            print(f"📊 Initial clicks: {basic_url['clicks']}")

        except URLShortenerAPIError as e:
            print(f"❌ URL creation failed: {e}")

        # Example 4: Create advanced short URL
        print("\n4. Creating Advanced Short URL")
        try:
            expires_at = datetime.now() + timedelta(days=365)
            advanced_url = api.create_url(
                original_url="https://github.com/awesome-project/repository",
                title="Awesome Open Source Project",
                custom_slug="awesome-repo-2024",
                expires_at=expires_at,
                tags=["github", "open-source", "development", "awesome"]
            )
            print(f"✅ Advanced short URL created: {advanced_url['shortUrl']}")
            print(f"🏷️  Tags: {', '.join(advanced_url['tags'])}")
            print(f"⏰ Expires: {expires_at.strftime('%Y-%m-%d')}")

        except URLShortenerAPIError as e:
            print(f"❌ Advanced URL creation failed: {e}")
            if e.error_code == 'SLUG_EXISTS':
                print("💡 Try a different custom slug")

        # Example 5: List URLs with filtering
        print("\n5. Listing URLs with Filtering")
        try:
            urls_response = api.get_urls(
                page=1,
                limit=10,
                search="github",
                tag="development",
                sort_by="clicks",
                sort_order="desc"
            )

            urls_list = urls_response['urls']
            pagination = urls_response['pagination']

            print(f"✅ Found {pagination['totalItems']} URLs")
            print("📊 Top URLs by clicks:")

            for i, url in enumerate(urls_list[:3], 1):
                print(f"   {i}. {url['title']} - {url['clicks']} clicks")
                print(f"      {url['shortUrl']}")

        except URLShortenerAPIError as e:
            print(f"❌ Failed to list URLs: {e}")

        # Example 6: Update URL
        print("\n6. Updating URL Details")
        try:
            # Get first URL to update
            urls_response = api.get_urls(limit=1)
            if urls_response['urls']:
                url_to_update = urls_response['urls'][0]
                url_id = url_to_update['id']

                updated_url = api.update_url(
                    url_id=url_id,
                    title="Updated Title - Now Even More Awesome!",
                    tags=["updated", "awesome", "demo"],
                    is_active=True
                )
                print(f"✅ URL updated: {updated_url['title']}")
                print(f"🏷️  New tags: {', '.join(updated_url['tags'])}")
            else:
                print("ℹ️  No URLs available to update")

        except URLShortenerAPIError as e:
            print(f"❌ URL update failed: {e}")

        # =======================================================================
        # Analytics Examples
        # =======================================================================

        print("\n📋 Analytics Examples")
        print("-" * 40)

        # Example 7: URL-specific analytics
        print("7. URL-Specific Analytics")
        try:
            urls_response = api.get_urls(limit=1)
            if urls_response['urls']:
                url_id = urls_response['urls'][0]['id']

                analytics = api.get_url_analytics(
                    url_id=url_id,
                    period='30d',
                    granularity='day'
                )

                print("✅ Analytics retrieved:")
                print(f"📊 Total clicks: {analytics['summary']['totalClicks']}")
                print(f"👥 Unique clicks: {analytics['summary']['uniqueClicks']}")
                print(f"📈 Avg clicks/day: {analytics['summary']['averageClicksPerDay']:.1f}")

                if analytics['geography']:
                    print("🌍 Top countries:")
                    for i, geo in enumerate(analytics['geography'][:3], 1):
                        print(f"   {i}. {geo['country']}: {geo['clicks']} clicks ({geo['percentage']:.1f}%)")

                if analytics['referrers']:
                    print("🔗 Top referrers:")
                    for i, ref in enumerate(analytics['referrers'][:3], 1):
                        print(f"   {i}. {ref['referrer']}: {ref['clicks']} clicks ({ref['percentage']:.1f}%)")

            else:
                print("ℹ️  No URLs available for analytics")

        except URLShortenerAPIError as e:
            print(f"❌ Analytics retrieval failed: {e}")

        # Example 8: Dashboard analytics
        print("\n8. Dashboard Analytics Overview")
        try:
            dashboard = api.get_dashboard_analytics(period='30d')

            summary = dashboard['summary']
            print("✅ Dashboard data retrieved:")
            print(f"🔗 Total URLs: {summary['totalUrls']}")
            print(f"📊 Total clicks: {summary['totalClicks']:,}")
            print(f"👥 Unique clicks: {summary['uniqueClicks']:,}")
            print(f"📈 Clicks today: {summary['clicksToday']}")

            if dashboard['topUrls']:
                print("🏆 Top performing URLs:")
                for i, url in enumerate(dashboard['topUrls'][:3], 1):
                    print(f"   {i}. {url['title']} - {url['clicks']} clicks")

        except URLShortenerAPIError as e:
            print(f"❌ Dashboard analytics failed: {e}")

        # =======================================================================
        # Advanced Examples
        # =======================================================================

        print("\n📋 Advanced Examples")
        print("-" * 40)

        # Example 9: Bulk URL creation
        print("9. Bulk URL Creation")
        try:
            urls_to_create = [
                URLData(
                    original_url="https://www.example.com/page1",
                    title="Example Page 1",
                    tags=["bulk", "example", "page1"]
                ),
                URLData(
                    original_url="https://www.example.com/page2",
                    title="Example Page 2",
                    tags=["bulk", "example", "page2"]
                ),
                URLData(
                    original_url="https://www.example.com/page3",
                    title="Example Page 3",
                    tags=["bulk", "example", "page3"]
                )
            ]

            print(f"Creating {len(urls_to_create)} URLs...")
            bulk_result = api.create_multiple_urls(
                urls_data=urls_to_create,
                max_concurrent=2,
                delay_between=0.5
            )

            print(f"✅ Successfully created {bulk_result['success_count']} URLs")
            if bulk_result['error_count'] > 0:
                print(f"❌ {bulk_result['error_count']} errors occurred")
                for error in bulk_result['errors'][:3]:  # Show first 3 errors
                    print(f"   - {error['error']}")

        except URLShortenerAPIError as e:
            print(f"❌ Bulk creation failed: {e}")

        # Example 10: Rate limit monitoring
        print("\n10. Rate Limit Monitoring")
        try:
            result = api.get_urls(limit=1)
            rate_limit = result.get('_rate_limit', {})

            if rate_limit.get('limit'):
                limit = int(rate_limit['limit'])
                remaining = int(rate_limit['remaining'])
                reset_time = datetime.fromtimestamp(int(rate_limit['reset']))

                print("✅ Rate limit information:")
                print(f"📊 Limit: {limit} requests per hour")
                print(f"⏳ Remaining: {remaining} requests")
                print(f"🕐 Resets at: {reset_time.strftime('%H:%M:%S')}")

                usage_percentage = ((limit - remaining) / limit * 100)
                print(f"📈 Usage: {usage_percentage:.1f}%")
            else:
                print("ℹ️  Rate limit information not available")

        except URLShortenerAPIError as e:
            print(f"❌ Rate limit check failed: {e}")

        # =======================================================================
        # Error Handling Examples
        # =======================================================================

        print("\n📋 Error Handling Examples")
        print("-" * 40)

        print("11. Error Handling Demonstration")

        # Validation Error Example
        print("\n   Validation Error:")
        try:
            api.create_url(
                original_url="not-a-valid-url",
                title="Invalid URL Test"
            )
        except URLShortenerAPIError as e:
            if e.error_code == 'VALIDATION_ERROR':
                print(f"   ❌ Validation Error: {e}")
                if e.details:
                    for detail in e.details:
                        print(f"      - {detail['field']}: {detail['message']}")

        # Not Found Error Example
        print("\n   Not Found Error:")
        try:
            api.get_url(999999)
        except URLShortenerAPIError as e:
            if e.status_code == 404:
                print(f"   ❌ Not Found: {e}")

        print("\n✅ All examples completed successfully!")
        print("💡 Check the code comments for more usage patterns")

    except KeyboardInterrupt:
        print("\n\n⚠️  Examples interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"\n❌ Unexpected error: {e}")


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def create_client_from_env() -> URLShortenerAPI:
    """Create API client using environment variables"""
    return URLShortenerAPI(
        base_url=os.getenv('API_BASE_URL', 'https://api.urlshortener.com'),
        access_token=os.getenv('ACCESS_TOKEN'),
        refresh_token=os.getenv('REFRESH_TOKEN')
    )

def export_urls_to_csv(api: URLShortenerAPI, filename: str = 'urls_export.csv') -> None:
    """Export all URLs to CSV file"""
    import csv

    print(f"Exporting URLs to {filename}...")

    all_urls = []
    page = 1

    while True:
        try:
            response = api.get_urls(page=page, limit=100)
            urls = response['urls']

            if not urls:
                break

            all_urls.extend(urls)

            if not response['pagination']['hasNext']:
                break

            page += 1

        except URLShortenerAPIError as e:
            print(f"Error fetching page {page}: {e}")
            break

    # Write to CSV
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        if all_urls:
            fieldnames = ['id', 'title', 'originalUrl', 'shortUrl', 'shortCode',
                         'clicks', 'isActive', 'createdAt', 'tags']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()
            for url in all_urls:
                # Convert tags list to string
                url['tags'] = ', '.join(url.get('tags', []))
                writer.writerow({k: url.get(k, '') for k in fieldnames})

    print(f"✅ Exported {len(all_urls)} URLs to {filename}")

@retry_on_failure(max_retries=3, delay=1.0)
def create_url_with_retry(api: URLShortenerAPI, **kwargs) -> Dict[str, Any]:
    """Create URL with automatic retry on failure"""
    return api.create_url(**kwargs)

def monitor_url_performance(api: URLShortenerAPI, url_id: int,
                           duration_minutes: int = 60) -> None:
    """Monitor URL click performance over time"""
    print(f"Monitoring URL {url_id} for {duration_minutes} minutes...")

    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)

    previous_clicks = 0

    while time.time() < end_time:
        try:
            url_data = api.get_url(url_id)
            current_clicks = url_data['clicks']

            if current_clicks > previous_clicks:
                new_clicks = current_clicks - previous_clicks
                print(f"🔔 {new_clicks} new clicks! Total: {current_clicks}")
                previous_clicks = current_clicks

            time.sleep(60)  # Check every minute

        except URLShortenerAPIError as e:
            print(f"❌ Monitoring error: {e}")
            break
        except KeyboardInterrupt:
            print("\n⚠️  Monitoring stopped by user")
            break

    print("✅ Monitoring completed")

if __name__ == "__main__":
    main()