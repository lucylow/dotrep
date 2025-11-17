# Production-Ready Backend API

A comprehensive, production-ready REST API built with Node.js, Express, MongoDB, and modern best practices.

## Features

- ✅ **Security**: Helmet, CORS, rate limiting, JWT authentication, XSS protection, NoSQL injection protection
- ✅ **Error Handling**: Comprehensive error handling with custom error classes
- ✅ **Validation**: Joi validation with detailed error messages
- ✅ **Logging**: Winston logger with daily rotation and multiple transports
- ✅ **Caching**: Redis integration for improved performance
- ✅ **Database**: MongoDB with Mongoose, including indexes and pagination
- ✅ **Testing**: Jest setup with test examples
- ✅ **Docker**: Complete Docker setup with docker-compose
- ✅ **Code Quality**: ESLint and Prettier configuration
- ✅ **Performance**: Compression, proper indexing, connection pooling
- ✅ **Best Practices**: Environment variables, graceful shutdown, request ID tracking

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── middleware/      # Custom middleware
│   ├── config/          # Configuration files
│   ├── utils/           # Utility functions
│   └── app.js           # Main application file
├── tests/               # Test files
├── logs/                # Log files (generated)
├── docker-compose.yml    # Docker compose configuration
├── Dockerfile           # Docker image definition
└── package.json         # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis (optional, for caching)
- npm >= 9.0.0

### Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/production-app
JWT_SECRET=your-super-secret-jwt-key-here
```

### Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

#### Using Docker
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/profile` - Get current user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `PATCH /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token

### Products
- `GET /api/v1/products` - Get all products (with pagination and filtering)
- `GET /api/v1/products/featured` - Get featured products
- `GET /api/v1/products/:id` - Get single product
- `POST /api/v1/products` - Create product (admin/moderator only)
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product (soft delete)
- `PATCH /api/v1/products/:id/inventory` - Update inventory (admin/moderator only)

### Health Check
- `GET /health` - Health check endpoint

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Code Quality

Lint code:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

### Optional Variables
- `REDIS_URL` - Redis connection string (for caching)
- `EMAIL_*` - Email configuration (for sending emails)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit configuration
- `LOG_LEVEL` - Logging level (info, warn, error, debug)

## Security Features

1. **Helmet**: Sets various HTTP headers for security
2. **CORS**: Configurable Cross-Origin Resource Sharing
3. **Rate Limiting**: Prevents brute force attacks
4. **XSS Protection**: Sanitizes user input
5. **NoSQL Injection Protection**: Sanitizes MongoDB queries
6. **JWT Authentication**: Secure token-based authentication
7. **Password Hashing**: Bcrypt with salt rounds
8. **Account Locking**: Locks account after failed login attempts

## Error Handling

The API uses a centralized error handling system:
- Custom `AppError` class for operational errors
- Different error responses for development and production
- Request ID tracking for debugging
- Detailed error messages in development mode

## Logging

Logs are written to:
- `logs/error-YYYY-MM-DD.log` - Error logs
- `logs/combined-YYYY-MM-DD.log` - All logs
- `logs/access-YYYY-MM-DD.log` - HTTP access logs

Logs are rotated daily and kept for 14 days by default.

## Caching

Redis is used for caching:
- Product listings (5 minutes)
- Individual products (10 minutes)
- Featured products (15 minutes)

Cache is automatically invalidated on updates.

## Database

MongoDB is used as the primary database:
- Connection pooling for better performance
- Indexes on frequently queried fields
- Pagination support using mongoose-paginate-v2
- Soft deletes for data retention

## Best Practices

1. **Async/Await**: All async operations use async/await with error handling
2. **Environment Variables**: All sensitive data in environment variables
3. **Validation**: Input validation using Joi schemas
4. **Error Handling**: Comprehensive error handling at all levels
5. **Logging**: Structured logging with Winston
6. **Security**: Multiple layers of security
7. **Testing**: Unit and integration tests
8. **Documentation**: Code comments and API documentation
9. **Graceful Shutdown**: Proper cleanup on application termination
10. **Request Tracking**: Request ID for tracing requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

MIT


