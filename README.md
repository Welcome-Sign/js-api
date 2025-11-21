# WelcomeSign JavaScript Client

A comprehensive JavaScript client library for the WelcomeSign REST API. This library provides full access to the WelcomeSign platform for managing vacation rental digital signage, including properties, devices, bookings, content, and subscriptions.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Servers](#api-servers)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [User Management](#user-management)
  - [Account Management](#account-management)
  - [Properties](#properties)
  - [Rooms](#rooms)
  - [Devices](#devices)
  - [Device Pairing](#device-pairing)
  - [Bookings](#bookings)
  - [Content](#content)
  - [Subscriptions & Billing](#subscriptions--billing)
  - [Pricing](#pricing)
- [Error Handling](#error-handling)
- [OpenAPI Specification](#openapi-specification)

## Installation

### Browser

Include the script directly in your HTML:

```html
<script src="welcomesign.js"></script>
<script>
  const client = WelcomeSign.createClient({
    baseURL: 'https://api.welcomesign.com'
  });
</script>
```

### Node.js / ES Modules

```javascript
const WelcomeSign = require('./welcomesign.js');
// or
import WelcomeSign from './welcomesign.js';

const client = WelcomeSign.createClient({
  baseURL: 'https://api.welcomesign.com'
});
```

## Quick Start

```javascript
// Create a client with automatic token persistence
const client = WelcomeSign.createClient({
  baseURL: 'https://api.welcomesign.com'
});

// Register a new user
const userData = await client.register({
  email: 'user@example.com',
  password: 'securepassword123',
  firstname: 'John',
  lastname: 'Doe'
});

// Or login with existing credentials
const loginData = await client.login('user@example.com', 'securepassword123');

// Get user profile
const profile = await client.getMe();

// Create a property
const property = await client.createProperty({
  name: 'Sunset Beach Villa',
  address_line1: '123 Ocean Drive',
  city: 'Miami',
  state: 'FL',
  zip: '33139',
  wifi_ssid: 'SunsetVilla-Guest',
  wifi_password: 'Welcome2023',
  timezone: 'America/New_York'
});

// Get all properties
const properties = await client.getProperties();
```

## API Servers

The API is available at the following endpoints:

| Environment | URL |
|-------------|-----|
| Production | `https://api.welcomesign.com` |
| Staging | `https://staging-api.welcomesign.com` |

## Authentication

### Client Configuration

```javascript
// Basic client (manual token management)
const client = new WelcomeSign.WelcomeSignClient({
  baseURL: 'https://api.welcomesign.com',
  token: 'your-jwt-token',           // Optional: initial access token
  refreshToken: 'your-refresh-token', // Optional: for automatic refresh
  onTokenRefresh: (tokens) => {
    // Called when tokens are refreshed
    console.log('New tokens:', tokens);
  },
  onAuthError: (error) => {
    // Called when authentication fails
    console.error('Auth error:', error);
  }
});

// Client with automatic persistence (recommended)
const client = WelcomeSign.createClient({
  baseURL: 'https://api.welcomesign.com',
  storage: localStorage,              // Optional: defaults to localStorage in browser
  storageKey: 'welcomesign_tokens'    // Optional: storage key name
});
```

### User Authentication

```javascript
// Register new user
const result = await client.register({
  email: 'user@example.com',
  password: 'securepassword123',
  firstname: 'John',
  lastname: 'Doe',
  phone: '+1-555-123-4567'
});
// Returns: { user, token, refresh_token, expires_at }

// Login
const result = await client.login('user@example.com', 'password');
// Returns: { user, token, refresh_token, expires_at }

// Logout
await client.logout();

// Get active sessions
const sessions = await client.getSessions();

// Revoke all other sessions
await client.revokeAllSessions();

// Password reset flow
await client.forgotPassword('user@example.com');
await client.resetPassword('reset-token-from-email', 'newpassword123');
```

### Device Authentication

For TV/device apps, use the device pairing flow:

```javascript
// 1. Generate pairing code (on device)
const pairing = await client.generatePairingCode('device-serial-123');
// Returns: { code: "ABC123", expires_at: "...", device_identifier: "..." }

// 2. Display code to user, they enter it in web app

// 3. Register device with the code (from web app)
const device = await client.registerDevice({
  code: 'ABC123',
  property_id: 'property-uuid',
  platform: 'roku',
  name: 'Living Room TV'
});
// Returns: { device_id, device_token, property, ... }

// 4. Use device token for device-specific endpoints
client.setDeviceToken(device.device_token);

// Get device info
const info = await client.getDeviceInfo();

// Get content for display
const content = await client.getDeviceContent();

// Send heartbeat (keeps device marked as online)
await client.deviceHeartbeat();

// Start automatic heartbeat (every 60 seconds)
const heartbeatId = client.startDeviceHeartbeat(60000);

// Stop heartbeat
client.stopDeviceHeartbeat(heartbeatId);
```

### Handling Device Session Invalidation

```javascript
const client = WelcomeSign.createClient({
  baseURL: 'https://api.welcomesign.com',
  onDeviceSessionInvalid: () => {
    // Device was unpaired or session expired
    // Clear local state and restart pairing flow
    console.log('Device session invalid, returning to pairing screen');
    window.location.href = '/pairing';
  }
});
```

## API Reference

### User Management

```javascript
// Get current user
const user = await client.getMe();

// Update profile
const updated = await client.updateMe({
  firstname: 'John',
  lastname: 'Smith',
  email: 'newemail@example.com',
  phone: '+1-555-987-6543'
});

// Change password
await client.changePassword('currentPassword', 'newPassword');

// Delete account
await client.deleteMe();

// Get/update settings
const settings = await client.getSettings();
await client.updateSettings({
  email_notifications: true,
  timezone: 'America/New_York'
});
```

### Account Management

```javascript
// Get all accounts
const accounts = await client.getAccounts();

// Get primary account
const account = await client.getMyAccount();

// Update account
await client.updateMyAccount({
  name: 'Sunset Rentals LLC',
  city: 'Miami',
  state: 'FL',
  num_properties: '6-10'
});

// Create additional account
const newAccount = await client.createAccount({
  name: 'Beach Properties Inc'
});

// Get specific account
const account = await client.getAccount('account-uuid');
```

### Properties

```javascript
// Get all properties
const properties = await client.getProperties();

// Filter by account
const properties = await client.getProperties({ account_id: 'account-uuid' });

// Get single property
const property = await client.getProperty('property-uuid');

// Create property
const property = await client.createProperty({
  name: 'Sunset Beach Villa',
  address_line1: '123 Ocean Drive',
  address_line2: 'Unit 4B',
  city: 'Miami',
  state: 'FL',
  zip: '33139',
  bedrooms: 3,
  bathrooms: 2.5,
  property_type: 'villa',  // house, townhouse, condo, apartment, villa, cottage, houseboat, other
  phone: '+1-555-123-4567',
  wifi_ssid: 'SunsetVilla-Guest',
  wifi_password: 'Welcome2023',
  timezone: 'America/New_York',
  default_checkin_time: '16:00',
  default_checkout_time: '10:00'
});

// Update property
await client.updateProperty('property-uuid', {
  name: 'Updated Villa Name',
  wifi_password: 'NewPassword2024'
});

// Delete property
await client.deleteProperty('property-uuid');
```

### Rooms

Rooms are available on Pro and Enterprise plans.

```javascript
// Get rooms for property
const rooms = await client.getPropertyRooms('property-uuid');

// Get single room
const room = await client.getRoom('room-uuid');

// Create room
const room = await client.createRoom('property-uuid', {
  name: 'Living Room',
  description: 'Main living area with ocean view'
});

// Update room
await client.updateRoom('room-uuid', {
  name: 'Primary Bedroom',
  description: 'Master suite with ensuite bathroom'
});

// Delete room
await client.deleteRoom('room-uuid');
```

### Devices

```javascript
// Get all devices
const devices = await client.getDevices();

// Get devices for a property
const devices = await client.getPropertyDevices('property-uuid');

// Get single device
const device = await client.getDevice('device-uuid');

// Update device
await client.updateDevice('device-uuid', {
  name: 'Kitchen TV',
  location: 'Kitchen counter'
});

// Delete device
await client.deleteDevice('device-uuid');

// Get preview URL (for testing device display)
const preview = await client.getDevicePreview('device-uuid');
// Returns: { preview_url, device_id, device_identifier }
```

### Device Pairing

```javascript
// Generate pairing code (no auth required)
const pairing = await client.generatePairingCode('device-serial-or-mac');
// Returns: { code: "ABC123", expires_at: "2024-01-01T12:00:00Z", device_identifier: "..." }

// Verify code validity (no auth required)
const validity = await client.verifyPairingCode('ABC123');
// Returns: { valid: true, device_identifier: "...", expires_at: "..." }

// Register device (requires user auth)
const device = await client.registerDevice({
  code: 'ABC123',
  property_id: 'property-uuid',
  platform: 'roku',  // roku, android, firetv, appletv, samsung, lg, web
  name: 'Living Room TV'
});
// Returns device with device_token for subsequent API calls
```

### Bookings

```javascript
// Get all bookings
const bookings = await client.getBookings();
const bookings = await client.getBookings({ status: 'confirmed' });

// Get upcoming bookings
const upcoming = await client.getUpcomingBookings();

// Get bookings for property
const bookings = await client.getPropertyBookings('property-uuid', {
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  status: 'confirmed'
});

// Get single booking
const booking = await client.getBooking('property-uuid', 'booking-uuid');

// Get current active booking
const current = await client.getCurrentBooking('property-uuid');

// Create booking
const booking = await client.createBooking('property-uuid', {
  check_in: '2024-06-01',
  check_out: '2024-06-07',
  guest_name: 'Jane Smith',
  guest_email: 'jane@example.com',
  guest_phone: '+1-555-234-5678',
  num_guests: 4,
  status: 'confirmed',
  source: 'airbnb',
  pms_booking_id: 'HMABCD123'
});

// Update booking
await client.updateBooking('property-uuid', 'booking-uuid', {
  num_guests: 5,
  status: 'in_progress'
});

// Delete booking
await client.deleteBooking('property-uuid', 'booking-uuid');
```

### Content

```javascript
// Get all content
const content = await client.getContent();

// Get content for property
const content = await client.getPropertyContent('property-uuid');

// Get content by type
const messages = await client.getPropertyContentByType('property-uuid', 'welcome_message');
const rules = await client.getPropertyContentByType('property-uuid', 'house_rules');

// Get single content item
const item = await client.getContentItem('content-uuid');

// Create content
const content = await client.createContent({
  property_id: 'property-uuid',
  content_type: 'welcome_message',
  room_id: 'room-uuid',     // Optional: target specific room
  device_id: 'device-uuid', // Optional: target specific device
  data: {
    title: 'Welcome!',
    body: 'We hope you enjoy your stay at Sunset Villa.'
  }
});

// Update content
await client.updateContent('content-uuid', {
  data: {
    title: 'Welcome to Paradise!',
    body: 'Updated welcome message...'
  }
});

// Delete content
await client.deleteContent('content-uuid');
```

### Subscriptions & Billing

```javascript
// Get current subscription
const subscription = await client.getSubscription();
// Returns: { tier, status, limits, features, usage, ... }

// Create subscription (upgrade from free)
const result = await client.createSubscription({
  plan: 'pro',  // basic, pro, enterprise
  payment_token: 'pm_xxx'  // Stripe payment method ID
});

// Change plan
await client.changePlan('enterprise');

// Cancel subscription
await client.cancelSubscription();           // Cancel at period end
await client.cancelSubscription(true);       // Cancel immediately

// Reactivate cancelled subscription
await client.reactivateSubscription();

// Purchase lifetime plan
await client.purchaseLifetimePlan('pm_xxx');

// Get invoices
const invoices = await client.getInvoices();

// Manage payment methods
const methods = await client.getPaymentMethods();
await client.addPaymentMethod({
  payment_method_id: 'pm_xxx',
  set_as_default: true
});
await client.removePaymentMethod('pm-id');

// Get Stripe billing portal URL
const { url } = await client.getBillingPortalUrl();
```

### Pricing

Public endpoints - no authentication required.

```javascript
// Get all plans
const { plans, metadata } = await client.getPricingPlans();

// Get specific plan
const plan = await client.getPricingPlan('pro');
// plan IDs: free, basic, pro, enterprise, lifetime_founder

// Get feature comparison matrix
const comparison = await client.getPricingComparison();

// Check lifetime plan availability
const availability = await client.getLifetimeAvailability();
// Returns: { available: true, purchased: 45, remaining: 155, expires_at: "..." }
```

### Utility Methods

```javascript
// Check if limit is unlimited (-1)
client.isUnlimited(subscription.limits.devices);  // true if -1

// Format limit for display
client.formatLimit(-1);        // "Unlimited"
client.formatLimit(null);      // "N/A"
client.formatLimit(25);        // "25"

// Format price for display
client.formatPrice(99);        // "$99"
client.formatPrice(0);         // "Free"
client.formatPrice(null);      // "N/A"

// Check usage against limits
client.isWithinLimit(5, 10);   // true
client.isWithinLimit(5, -1);   // true (unlimited)
client.isWithinLimit(5, null); // false (not applicable)

// Get remaining capacity
client.getRemainingCapacity(5, 10);   // 5
client.getRemainingCapacity(5, -1);   // -1 (unlimited)
```

## Error Handling

The client throws errors with additional properties for API errors:

```javascript
try {
  await client.getProperty('invalid-uuid');
} catch (error) {
  console.error(error.message);     // "Property not found"
  console.error(error.status);      // 404
  console.error(error.data);        // { error: "...", message: "..." }
}
```

Common HTTP status codes:

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |

### Automatic Token Refresh

The client automatically refreshes expired tokens when a 401 response is received. Configure callbacks to handle token updates:

```javascript
const client = WelcomeSign.createClient({
  baseURL: 'https://api.welcomesign.com',
  onTokenRefresh: (tokens) => {
    // Tokens were automatically refreshed
    console.log('Tokens refreshed:', tokens.token);
  },
  onAuthError: (error) => {
    // Refresh failed - redirect to login
    window.location.href = '/login';
  }
});
```

## OpenAPI Specification

The complete API specification is available in OpenAPI 3.0 format:

```
openapi/
├── openapi.yaml              # Main specification file
└── components/
    ├── parameters/
    │   └── common.yaml       # Shared parameters
    ├── paths/
    │   ├── authentication.yaml
    │   ├── users.yaml
    │   ├── accounts.yaml
    │   ├── properties.yaml
    │   ├── rooms.yaml
    │   ├── devices.yaml
    │   ├── device-api.yaml
    │   ├── device-pairing.yaml
    │   ├── bookings.yaml
    │   ├── content.yaml
    │   ├── subscriptions.yaml
    │   ├── pricing.yaml
    │   ├── analytics.yaml
    │   ├── integrations.yaml
    │   └── webhooks.yaml
    ├── responses/
    │   └── common.yaml       # Shared error responses
    ├── schemas/
    │   ├── User.yaml
    │   ├── Account.yaml
    │   ├── Property.yaml
    │   ├── Room.yaml
    │   ├── Device.yaml
    │   ├── Booking.yaml
    │   ├── Content.yaml
    │   ├── Subscription.yaml
    │   └── ...
    └── security/
        └── schemes.yaml      # Auth schemes
```

### Viewing the Specification

You can use tools like [Swagger UI](https://swagger.io/tools/swagger-ui/) or [Redoc](https://redocly.com/redoc/) to view the API documentation:

```bash
# Using Swagger UI with Docker
docker run -p 8080:8080 -e SWAGGER_JSON=/spec/openapi.yaml -v $(pwd)/openapi:/spec swaggerapi/swagger-ui

# Using Redoc
npx @redocly/cli preview-docs openapi/openapi.yaml
```

### Generating Client SDKs

Use [OpenAPI Generator](https://openapi-generator.tech/) to generate clients for other languages:

```bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i openapi/openapi.yaml \
  -g typescript-fetch \
  -o generated/typescript

# Generate Python client
npx @openapitools/openapi-generator-cli generate \
  -i openapi/openapi.yaml \
  -g python \
  -o generated/python
```

## License

Proprietary - See LICENSE file for details.

## Support

- Documentation: https://welcomesign.com/docs
- API Support: https://welcomesign.com/support
- Issues: Contact support with your account details
