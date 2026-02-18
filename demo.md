# URL Shortener Demo

This demonstration shows the Node.js URL shortener in action.

## Starting the Server

```bash
npm start
```

The server will start on http://localhost:3000

## Demo Flow

### 1. Web Interface Demo

- Visit http://localhost:3000
- Enter a long URL like: `https://www.example.com/very/long/path/to/a/page?with=parameters&and=more`
- Click "Shorten URL"
- Copy the generated short URL
- Use the short URL to redirect to the original

### 2. API Demo

#### Create Short URL
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.github.com/user/repository"}'
```

#### Create with Custom Code
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.npm.org", "customCode": "mynpm"}'
```

#### Get Statistics
```bash
curl http://localhost:3000/api/stats/mynpm
```

#### List All URLs
```bash
curl http://localhost:3000/api/urls?page=1&limit=5
```

#### Test Redirection
```bash
curl -I http://localhost:3000/mynpm
# Should return 302 redirect
```

### 3. Feature Highlights

✅ **URL Shortening**: Converts long URLs to short 6-character codes
✅ **Custom Codes**: Allows users to specify their own short codes
✅ **Click Tracking**: Counts how many times each link is accessed
✅ **URL Validation**: Ensures URLs are safe and properly formatted
✅ **Rate Limiting**: Prevents API abuse (100 requests per 15 minutes)
✅ **Security**: Blocks internal network URLs and malicious schemes
✅ **Responsive UI**: Works on desktop and mobile devices
✅ **Error Handling**: Comprehensive error messages and validation

### 4. Database

The application uses SQLite with the following data:
- Original URLs
- Generated short codes
- Creation timestamps
- Click counts

Database file: `database/urls.db`

### 5. Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Security**: Helmet.js, CORS, Rate Limiting
- **Validation**: Joi + Custom validators
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Testing**: Jest + Supertest

## Production Considerations

For production deployment:

1. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=3000`

2. **Database**:
   - Consider PostgreSQL or MySQL for production
   - Implement database backups

3. **Security**:
   - Add authentication for admin features
   - Implement proper logging
   - Set up monitoring

4. **Performance**:
   - Add caching (Redis)
   - Implement database connection pooling
   - Use process manager (PM2)

5. **Scaling**:
   - Load balancer for multiple instances
   - CDN for static assets
   - Database read replicas