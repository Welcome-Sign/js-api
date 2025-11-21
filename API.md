# WelcomeSign API Documentation

REST API for WelcomeSign - A digital signage platform for vacation rentals and hospitality properties.

## API Specification

The complete API specification is available in OpenAPI 3.0 format:

- **Main spec:** [`openapi/openapi.yaml`](openapi/openapi.yaml)
- **Components:** [`openapi/components/`](openapi/components/)

### Viewing the API Documentation

You can view the API documentation using any OpenAPI-compatible tool:

```bash
# Using Swagger UI (Docker)
docker run -p 8080:8080 -e SWAGGER_JSON=/spec/openapi.yaml -v $(pwd)/openapi:/spec swaggerapi/swagger-ui

# Using Redoc
npx @redocly/cli preview-docs openapi/openapi.yaml

# Using Stoplight
npx @stoplight/prism-cli mock openapi/openapi.yaml
```

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.welcomesign.com` |
| Staging | `https://staging-api.welcomesign.com` |

## Authentication

The API uses Bearer token authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

Devices use a separate `DeviceAuth` scheme with device-specific tokens.

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/sessions` - List active sessions
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### Users
- `GET /users/me` - Get current user
- `PUT /users/me` - Update current user
- `PUT /users/me/password` - Change password
- `GET /users/me/settings` - Get user settings
- `PUT /users/me/settings` - Update user settings

### Accounts
- `GET /accounts` - List user's accounts
- `POST /accounts` - Create account
- `GET /accounts/me` - Get current account
- `GET /accounts/{id}` - Get account by ID
- `PUT /accounts/{id}` - Update account
- `DELETE /accounts/{id}` - Delete account
- `GET /accounts/{account_id}/users` - List account users
- `POST /accounts/{account_id}/users` - Add user to account
- `DELETE /accounts/{account_id}/users/{user_id}` - Remove user

### Invitations
- `POST /invitations` - Send invitation
- `POST /invitations/{token}/accept` - Accept invitation
- `POST /invitations/{token}/decline` - Decline invitation

### Properties
- `GET /properties` - List properties
- `POST /properties` - Create property
- `GET /properties/{id}` - Get property
- `PUT /properties/{id}` - Update property
- `DELETE /properties/{id}` - Delete property

### Rooms (Pro/Enterprise)
- `GET /properties/{property_id}/rooms` - List rooms
- `POST /properties/{property_id}/rooms` - Create room
- `GET /rooms/{id}` - Get room
- `PUT /rooms/{id}` - Update room
- `DELETE /rooms/{id}` - Delete room

### Devices
- `GET /properties/{property_id}/devices` - List property devices
- `POST /devices/register` - Register new device
- `GET /devices` - List all devices
- `GET /devices/{id}` - Get device
- `PUT /devices/{id}` - Update device
- `DELETE /devices/{id}` - Delete device
- `POST /devices/{id}/preview` - Preview device display
- `POST /properties/{property_id}/devices/{device_id}/ping` - Ping device
- `POST /properties/{property_id}/devices/{device_id}/restart` - Restart device

### Device Pairing
- `POST /pairing/code` - Generate pairing code
- `GET /pairing/verify/{code}` - Verify pairing code

### Device API (Device-authenticated)
- `GET /device/content` - Get display content
- `POST /device/heartbeat` - Send heartbeat
- `GET /device/info` - Get device info

### Bookings
- `GET /properties/{property_id}/bookings` - List property bookings
- `POST /properties/{property_id}/bookings` - Create booking
- `GET /properties/{property_id}/bookings/{id}` - Get booking
- `PUT /properties/{property_id}/bookings/{id}` - Update booking
- `DELETE /properties/{property_id}/bookings/{id}` - Delete booking
- `GET /properties/{property_id}/bookings/current` - Get current booking
- `GET /bookings` - List all bookings
- `GET /bookings/upcoming` - List upcoming bookings

### Content
- `GET /content` - List all content
- `POST /content` - Create content
- `GET /content/{id}` - Get content
- `PUT /content/{id}` - Update content
- `DELETE /content/{id}` - Delete content
- `GET /properties/{property_id}/content` - List property content
- `GET /properties/{property_id}/content/{type}` - Get content by type

### Pricing (Public)
- `GET /pricing/plans` - List pricing plans
- `GET /pricing/plans/{id}` - Get plan details
- `GET /pricing/compare` - Compare plans
- `GET /pricing/availability/lifetime` - Check lifetime plan availability

### Subscriptions
- `GET /subscriptions` - Get current subscription
- `POST /subscriptions/subscribe` - Subscribe to plan
- `POST /subscriptions/cancel` - Cancel subscription
- `POST /subscriptions/reactivate` - Reactivate subscription
- `POST /subscriptions/lifetime` - Purchase lifetime plan
- `PUT /subscriptions/payment-method` - Update payment method
- `PUT /subscriptions/plan` - Change plan

### Billing
- `GET /billing/invoices` - List invoices
- `GET /billing/payment-methods` - List payment methods
- `POST /billing/payment-methods` - Add payment method
- `DELETE /billing/payment-methods/{id}` - Remove payment method
- `GET /billing/portal` - Get billing portal URL

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook endpoint

### Analytics (Pro/Enterprise)
- `GET /analytics/properties/{property_id}` - Property analytics
- `GET /analytics/devices/{device_id}` - Device analytics
- `POST /analytics/events` - Record analytics event

### Integrations
- `GET /integrations` - List available integrations
- `GET /integrations/{property_id}` - List property integrations
- `POST /integrations/{property_id}/{pms_type}` - Connect integration
- `DELETE /integrations/{property_id}/{pms_type}` - Disconnect integration
- `POST /integrations/{property_id}/{pms_type}/sync` - Sync integration

## Error Responses

All errors follow a standard format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limiting

API requests are rate-limited. Current limits are returned in response headers:

- `X-RateLimit-Limit` - Requests allowed per window
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Window reset timestamp

## Schema Reference

Detailed schemas are available in [`openapi/components/schemas/`](openapi/components/schemas/):

- `User.yaml` - User account
- `Account.yaml` - Organization account
- `Property.yaml` - Rental property
- `Room.yaml` - Room within property
- `Device.yaml` - TV/screen device
- `Booking.yaml` - Guest booking
- `Content.yaml` - Display content
- `Subscription.yaml` - Subscription details
- `PricingPlan.yaml` - Pricing plan
- `Invoice.yaml` - Billing invoice
- `PaymentMethod.yaml` - Payment method
- `Analytics.yaml` - Analytics data
- `Integration.yaml` - PMS integration

## Support

For API support, contact: https://welcomesign.com/support
