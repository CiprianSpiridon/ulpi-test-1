# Node.js URL Shortener

A simple and efficient URL shortener service built with Node.js, Express.js, and SQLite. Transform long URLs into short, shareable links with click tracking and custom short codes.

## Features

- ✅ **URL Shortening**: Convert long URLs into short, manageable links
- ✅ **Custom Short Codes**: Create personalized short URLs with custom codes
- ✅ **Click Tracking**: Monitor how many times your links are accessed
- ✅ **SQLite Database**: Lightweight, file-based database for data persistence
- ✅ **RESTful API**: Clean API endpoints for programmatic access
- ✅ **Web Interface**: User-friendly web interface for easy URL management
- ✅ **URL Validation**: Comprehensive URL validation and safety checks
- ✅ **Rate Limiting**: Prevent abuse with built-in rate limiting
- ✅ **Security**: Helmet.js security headers and input sanitization
- ✅ **Responsive Design**: Mobile-friendly interface

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodejs-url-shortener
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - The API is available at `http://localhost:3000/api`

## Usage

### Web Interface

1. **Shorten a URL**:
   - Enter your long URL in the input field
   - Optionally provide a custom short code (4-10 characters)
   - Click "Shorten URL"
   - Copy your new short URL

2. **View Statistics**:
   - Click "View Stats" on any shortened URL
   - See creation date, click count, and other metrics

3. **Recent URLs**:
   - View recently created URLs in the dashboard
   - Click "Load More" to see additional URLs

### API Endpoints

#### Create Short URL
```bash
POST /api/shorten
Content-Type: application/json

{
  "url": "https://www.example.com/very/long/url",
  "customCode": "mylink" // optional
}
```

#### Get URL Statistics
```bash
GET /api/stats/:shortCode
```

#### List All URLs (Paginated)
```bash
GET /api/urls?page=1&limit=10
```

#### Redirect Short URL
```bash
GET /:shortCode
# Redirects to original URL and increments click count
```

#### Health Check
```bash
GET /api/health
```

## Project Structure

```
├── server.js              # Main application entry point
├── package.json           # Dependencies and scripts
├── database/
│   └── db.js              # SQLite database configuration
├── services/
│   └── urlService.js      # Core URL shortening logic
├── routes/
│   └── api.js             # API route handlers
├── middleware/
│   └── errorHandler.js    # Error handling middleware
├── utils/
│   ├── shortCodeGenerator.js # Short code generation utilities
│   └── validator.js       # Input validation utilities
├── public/
│   ├── index.html         # Web interface
│   ├── style.css          # Styling
│   └── script.js          # Client-side JavaScript
└── test/
    ├── api.test.js        # API endpoint tests
    └── urlService.test.js # Service layer tests
```

## Database Schema

The application uses SQLite with the following schema:

```sql
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_url TEXT NOT NULL,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  click_count INTEGER DEFAULT 0
);

CREATE INDEX idx_short_code ON urls(short_code);
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Rate Limiting

- Default: 100 requests per 15-minute window per IP
- Applies to `/api/*` endpoints only

### Security Features

- Helmet.js security headers
- CORS enabled for cross-origin requests
- Input validation and sanitization
- URL safety checks (blocks localhost, internal networks)
- SQL injection protection

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Development

### Available Scripts

```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
npm test        # Run test suite
```

### Adding New Features

1. **Database Changes**: Modify `database/db.js`
2. **Business Logic**: Update `services/urlService.js`
3. **API Endpoints**: Add routes in `routes/api.js`
4. **Frontend**: Update files in `public/`
5. **Tests**: Add tests in `test/` directory

## API Response Examples

### Successful URL Creation
```json
{
  "success": true,
  "data": {
    "id": 1,
    "original_url": "https://www.example.com/long-url",
    "short_code": "abc123",
    "short_url": "/abc123",
    "full_short_url": "http://localhost:3000/abc123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "click_count": 0,
    "exists": false
  },
  "message": "Short URL created successfully"
}
```

### URL Statistics
```json
{
  "success": true,
  "data": {
    "original_url": "https://www.example.com/long-url",
    "short_code": "abc123",
    "short_url": "/abc123",
    "full_short_url": "http://localhost:3000/abc123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "click_count": 42
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Please provide a valid HTTP or HTTPS URL",
    "status": 400
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue in the repository.

---

**Built with ❤️ using Node.js, Express.js, and SQLite**
