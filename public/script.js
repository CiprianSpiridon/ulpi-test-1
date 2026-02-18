// Global variables
let currentShortUrl = null;
let recentUrlsPage = 1;
let hasMoreUrls = true;

// DOM Elements
const shortenForm = document.getElementById('shortenForm');
const shortenBtn = document.getElementById('shortenBtn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');
const statsSection = document.getElementById('statsSection');
const originalUrlResult = document.getElementById('originalUrlResult');
const shortUrlResult = document.getElementById('shortUrlResult');
const recentUrls = document.getElementById('recentUrls');
const loadMoreBtn = document.getElementById('loadMoreBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Add form submit listener
    shortenForm.addEventListener('submit', handleShortenSubmit);

    // Add real-time validation for custom code
    const customCodeInput = document.getElementById('customCode');
    customCodeInput.addEventListener('input', validateCustomCode);

    // Load recent URLs on page load
    loadRecentUrls(true);
}

// Handle form submission
async function handleShortenSubmit(e) {
    e.preventDefault();

    const formData = new FormData(shortenForm);
    const url = formData.get('url').trim();
    const customCode = formData.get('customCode').trim();

    // Basic client-side validation
    if (!url) {
        showError('Please enter a URL');
        return;
    }

    if (!isValidUrl(url)) {
        showError('Please enter a valid HTTP or HTTPS URL');
        return;
    }

    if (customCode && !isValidCustomCode(customCode)) {
        showError('Custom code must be 4-10 characters and contain only letters and numbers');
        return;
    }

    setLoading(true);
    hideError();
    hideResult();

    try {
        const requestBody = { url };
        if (customCode) {
            requestBody.customCode = customCode;
        }

        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (response.ok) {
            showResult(result.data);
            currentShortUrl = result.data;

            // Refresh recent URLs to include the new one
            loadRecentUrls(true);
        } else {
            showError(result.error || 'Failed to create short URL');
        }
    } catch (error) {
        console.error('Error creating short URL:', error);
        showError('Network error. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Validate custom code input
function validateCustomCode(e) {
    const value = e.target.value;
    const isValid = !value || isValidCustomCode(value);

    if (isValid) {
        e.target.style.borderColor = '#e5e7eb';
    } else {
        e.target.style.borderColor = '#ef4444';
    }
}

// Validation helpers
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function isValidCustomCode(code) {
    return /^[a-zA-Z0-9]{4,10}$/.test(code);
}

// UI State Management
function setLoading(loading) {
    shortenBtn.disabled = loading;
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showResult(data) {
    originalUrlResult.href = data.original_url;
    originalUrlResult.textContent = data.original_url;

    shortUrlResult.href = data.full_short_url;
    shortUrlResult.textContent = data.full_short_url;

    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideResult() {
    resultSection.style.display = 'none';
}

// Result Actions
function copyToClipboard() {
    if (!currentShortUrl) return;

    navigator.clipboard.writeText(currentShortUrl.full_short_url).then(() => {
        const copyBtn = document.querySelector('.btn-copy');
        const originalText = copyBtn.textContent;

        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.background = '#059669';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#10b981';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentShortUrl.full_short_url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        alert('Short URL copied to clipboard!');
    });
}

async function viewStats() {
    if (!currentShortUrl) return;

    try {
        const response = await fetch(`/api/stats/${currentShortUrl.short_code}`);
        const result = await response.json();

        if (response.ok) {
            showStats(result.data);
        } else {
            showError('Failed to load statistics');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load statistics');
    }
}

function showStats(data) {
    document.getElementById('statsShortCode').textContent = data.short_code;
    document.getElementById('statsCreated').textContent = formatDate(data.created_at);
    document.getElementById('statsClicks').textContent = data.click_count.toLocaleString();

    hideResult();
    statsSection.style.display = 'block';
    statsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideStats() {
    statsSection.style.display = 'none';
    showResult(currentShortUrl);
}

function shortenAnother() {
    hideResult();
    hideStats();
    shortenForm.reset();
    document.getElementById('originalUrl').focus();
}

// Recent URLs Management
async function loadRecentUrls(reset = false) {
    if (reset) {
        recentUrlsPage = 1;
        recentUrls.innerHTML = '';
        hasMoreUrls = true;
    }

    if (!hasMoreUrls) return;

    try {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';

        const response = await fetch(`/api/urls?page=${recentUrlsPage}&limit=5`);
        const result = await response.json();

        if (response.ok) {
            const urls = result.data;

            if (urls.length === 0) {
                hasMoreUrls = false;
                if (recentUrlsPage === 1) {
                    recentUrls.innerHTML = '<p style="text-align: center; color: #6b7280;">No URLs created yet. Create your first short URL above!</p>';
                }
            } else {
                urls.forEach(url => {
                    recentUrls.appendChild(createRecentUrlElement(url));
                });

                recentUrlsPage++;
                hasMoreUrls = result.pagination.has_next;
            }
        } else {
            console.error('Failed to load recent URLs:', result.error);
        }
    } catch (error) {
        console.error('Error loading recent URLs:', error);
    } finally {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = hasMoreUrls ? 'Load More' : 'No More URLs';
    }
}

function createRecentUrlElement(url) {
    const urlElement = document.createElement('div');
    urlElement.className = 'recent-url';

    urlElement.innerHTML = `
        <div class="recent-url-header">
            <span class="recent-short-code">${url.short_code}</span>
            <span class="recent-date">${formatDate(url.created_at)}</span>
        </div>
        <a href="${url.original_url}" class="recent-original" target="_blank" rel="noopener">
            ${truncateUrl(url.original_url)}
        </a>
        <div class="recent-stats">
            Clicks: ${url.click_count.toLocaleString()} • Short URL:
            <a href="${url.full_short_url}" target="_blank" rel="noopener">${url.full_short_url}</a>
        </div>
    `;

    return urlElement;
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 7) {
        return date.toLocaleDateString();
    } else if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

function truncateUrl(url, maxLength = 60) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

// Handle network errors and show user-friendly messages
window.addEventListener('online', () => {
    console.log('Connection restored');
});

window.addEventListener('offline', () => {
    showError('You are currently offline. Please check your internet connection.');
});