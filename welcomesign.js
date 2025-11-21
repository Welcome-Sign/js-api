/**
 * WelcomeSign JavaScript Client Library
 *
 * A comprehensive client library for the WelcomeSign API with support for:
 * - User authentication (JWT tokens)
 * - Device authentication (device tokens)
 * - Automatic token refresh
 * - User, property, and device management
 * - Device pairing system
 *
 * @version 1.0.0
 * @license MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.WelcomeSign = factory());
})(this, (function () {
  'use strict';

  /**
   * WelcomeSign API Client
   */
  class WelcomeSignClient {
    /**
     * Create a new WelcomeSign client instance
     * @param {Object} options - Configuration options
     * @param {string} options.baseURL - API base URL (e.g., 'https://api.welcomesign.com')
     * @param {string} [options.token] - Initial JWT access token
     * @param {string} [options.refreshToken] - Initial refresh token
     * @param {string} [options.deviceToken] - Device token (for physical devices)
     * @param {Function} [options.onTokenRefresh] - Callback when tokens are refreshed
     * @param {Function} [options.onAuthError] - Callback when authentication fails
     * @param {Function} [options.onDeviceSessionInvalid] - Callback when device session is invalid (should clear storage and refresh to return to pairing)
     * @param {Object} [options.storage] - Storage implementation (must have getItem/setItem/removeItem)
     * @param {string} [options.storageKey='welcomesign_tokens'] - Key used for storage
     */
    constructor(options = {}) {
      if (!options.baseURL) {
        throw new Error('baseURL is required');
      }

      this.baseURL = options.baseURL.replace(/\/$/, ''); // Remove trailing slash
      this.token = options.token || null;
      this.refreshToken = options.refreshToken || null;
      this.deviceToken = options.deviceToken || null;
      this.onTokenRefresh = options.onTokenRefresh || null;
      this.onAuthError = options.onAuthError || null;
      this.onDeviceSessionInvalid = options.onDeviceSessionInvalid || null;
      this.storage = options.storage || null;
      this.storageKey = options.storageKey || 'welcomesign_tokens';
      this.isRefreshing = false;
      this.refreshPromise = null;
    }

    /**
     * Make an HTTP request to the API
     * @private
     */
    async _request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Add authentication header if token is available
      if (options.useDeviceToken && this.deviceToken) {
        headers['Authorization'] = `Bearer ${this.deviceToken}`;
      } else if (options.auth !== false && this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const config = {
        method: options.method || 'GET',
        headers,
        ...options
      };

      if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
      }

      try {
        const response = await fetch(url, config);
        const data = await response.json();

        // Handle successful response
        if (response.ok) {
          return data.data !== undefined ? data.data : data;
        }

        // Handle 401 - try to refresh token if available
        if (response.status === 401 && this.refreshToken && !options.skipTokenRefresh) {
          await this._refreshAccessToken();
          return this._request(endpoint, { ...options, skipTokenRefresh: true });
        }

        // Handle error responses
        const error = new Error(data.message || data.error || 'API request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      } catch (error) {
        if (error.status === 401 && this.onAuthError) {
          this.onAuthError(error);
        }
        throw error;
      }
    }

    /**
     * Refresh the access token using the refresh token
     * @private
     */
    async _refreshAccessToken() {
      // Prevent multiple simultaneous refresh requests
      if (this.isRefreshing) {
        return this.refreshPromise;
      }

      this.isRefreshing = true;
      this.refreshPromise = (async () => {
        try {
          const data = await this._request('/auth/refresh', {
            method: 'POST',
            body: { refresh_token: this.refreshToken },
            auth: false,
            skipTokenRefresh: true
          });

          this.token = data.token;
          this.refreshToken = data.refresh_token;

          if (this.onTokenRefresh) {
            this.onTokenRefresh({
              token: this.token,
              refreshToken: this.refreshToken,
              expiresAt: data.expires_at
            });
          }

          return data;
        } finally {
          this.isRefreshing = false;
          this.refreshPromise = null;
        }
      })();

      return this.refreshPromise;
    }

    // =========================================================================
    // AUTHENTICATION METHODS
    // =========================================================================

    /**
     * Register a new user account
     * @param {Object} userData - User registration data
     * @param {string} userData.email - User email
     * @param {string} userData.password - User password (min 8 characters)
     * @param {string} [userData.firstname] - First name
     * @param {string} [userData.lastname] - Last name
     * @param {string} [userData.phone] - Phone number (e.g., "+1-555-123-4567")
     * @returns {Promise<Object>} User data with tokens
     */
    async register(userData) {
      const data = await this._request('/auth/register', {
        method: 'POST',
        body: userData,
        auth: false
      });

      // Store tokens
      this.token = data.token;
      this.refreshToken = data.refresh_token;

      if (this.onTokenRefresh) {
        this.onTokenRefresh({
          token: this.token,
          refreshToken: this.refreshToken,
          expiresAt: data.expires_at
        });
      }

      return data;
    }

    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User data with tokens
     */
    async login(email, password) {
      const data = await this._request('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false
      });

      // Store tokens
      this.token = data.token;
      this.refreshToken = data.refresh_token;

      if (this.onTokenRefresh) {
        this.onTokenRefresh({
          token: this.token,
          refreshToken: this.refreshToken,
          expiresAt: data.expires_at
        });
      }

      return data;
    }

    /**
     * Logout and revoke current session
     * @returns {Promise<Object>} Logout confirmation
     */
    async logout() {
      const result = await this._request('/auth/logout', {
        method: 'POST'
      });

      // Clear tokens
      this.token = null;
      this.refreshToken = null;

      return result;
    }

    /**
     * Get all active sessions for the current user
     * @returns {Promise<Array>} List of active sessions
     */
    async getSessions() {
      return this._request('/auth/sessions');
    }

    /**
     * Revoke all sessions except the current one
     * @returns {Promise<Object>} Revocation confirmation
     */
    async revokeAllSessions() {
      return this._request('/auth/sessions', {
        method: 'DELETE'
      });
    }

    /**
     * Request a password reset email
     * @param {string} email - User email
     * @returns {Promise<Object>} Confirmation message
     */
    async forgotPassword(email) {
      return this._request('/auth/forgot-password', {
        method: 'POST',
        body: { email },
        auth: false
      });
    }

    /**
     * Reset password using reset token
     * @param {string} token - Reset token from email
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Confirmation message
     */
    async resetPassword(token, newPassword) {
      return this._request('/auth/reset-password', {
        method: 'POST',
        body: { token, password: newPassword },
        auth: false
      });
    }

    /**
     * Set authentication tokens manually
     * @param {string} token - JWT access token
     * @param {string} refreshToken - JWT refresh token
     */
    setTokens(token, refreshToken) {
      this.token = token;
      this.refreshToken = refreshToken;
    }

    /**
     * Get current tokens
     * @returns {Object} Current tokens
     */
    getTokens() {
      return {
        token: this.token,
        refreshToken: this.refreshToken,
        deviceToken: this.deviceToken
      };
    }

    /**
     * Clear all tokens from memory and storage
     */
    clearTokens() {
      this.token = null;
      this.refreshToken = null;
      this.deviceToken = null;

      // Clear from configured storage
      if (this.storage) {
        try {
          this.storage.removeItem(this.storageKey);
          console.log('Cleared tokens from storage:', this.storageKey);
        } catch (error) {
          console.error('Failed to clear tokens from storage:', error);
        }
      }

      // Also clear from localStorage directly as fallback
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(this.storageKey || 'welcomesign_tokens');
          // Clear any additional device-related keys that might exist
          localStorage.removeItem('welcomesign_device_id');
          localStorage.removeItem('welcomesign_device_identifier');
          localStorage.removeItem('welcomesign_device_token');
          console.log('Cleared all WelcomeSign data from localStorage');
        } catch (error) {
          console.error('Failed to clear from localStorage:', error);
        }
      }

      // Also clear from sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.removeItem(this.storageKey || 'welcomesign_tokens');
          // Clear any additional device-related keys that might exist
          sessionStorage.removeItem('welcomesign_device_id');
          sessionStorage.removeItem('welcomesign_device_identifier');
          sessionStorage.removeItem('welcomesign_device_token');
          console.log('Cleared all WelcomeSign data from sessionStorage');
        } catch (error) {
          console.error('Failed to clear from sessionStorage:', error);
        }
      }
    }

    // =========================================================================
    // USER MANAGEMENT
    // =========================================================================

    /**
     * Get current user profile
     * @returns {Promise<Object>} User profile data
     */
    async getMe() {
      return this._request('/users/me');
    }

    /**
     * Update current user profile
     * @param {Object} updates - Profile updates
     * @param {string} [updates.firstname] - First name
     * @param {string} [updates.lastname] - Last name
     * @param {string} [updates.email] - Email
     * @param {string} [updates.phone] - Phone number
     * @returns {Promise<Object>} Updated user profile
     */
    async updateMe(updates) {
      return this._request('/users/me', {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Delete current user account
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteMe() {
      return this._request('/users/me', {
        method: 'DELETE'
      });
    }

    /**
     * Change user password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Confirmation message
     */
    async changePassword(currentPassword, newPassword) {
      return this._request('/users/me/password', {
        method: 'PUT',
        body: {
          current_password: currentPassword,
          new_password: newPassword
        }
      });
    }

    /**
     * Get user settings
     * @returns {Promise<Object>} User settings
     */
    async getSettings() {
      return this._request('/users/me/settings');
    }

    /**
     * Update user settings
     * @param {Object} settings - Settings to update
     * @returns {Promise<Object>} Updated settings
     */
    async updateSettings(settings) {
      return this._request('/users/me/settings', {
        method: 'PUT',
        body: settings
      });
    }

    // =========================================================================
    // ACCOUNTS MANAGEMENT
    // =========================================================================

    /**
     * Get all accounts for the user
     * @returns {Promise<Array>} List of accounts
     */
    async getAccounts() {
      return this._request('/accounts');
    }

    /**
     * Get current user's primary account
     * @returns {Promise<Object>} Account data
     */
    async getMyAccount() {
      return this._request('/accounts/me');
    }

    /**
     * Update current user's primary account
     * @param {Object} updates - Account updates
     * @param {string} [updates.name] - Business or organization name
     * @param {string} [updates.address_line1] - Address line 1
     * @param {string} [updates.address_line2] - Address line 2
     * @param {string} [updates.city] - City
     * @param {string} [updates.state] - State
     * @param {string} [updates.zip] - ZIP code
     * @param {string} [updates.phone] - Phone number
     * @param {string} [updates.email] - Email address
     * @param {string} [updates.num_properties] - Number of properties managed: '1', '2-5', '6-10', '11-25', '26-50', '50+'
     * @returns {Promise<Object>} Updated account
     */
    async updateMyAccount(updates) {
      return this._request('/accounts/me', {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Create a new account
     * @param {Object} accountData - Account data
     * @param {string} accountData.name - Business or organization name (required)
     * @param {string} [accountData.address_line1] - Address line 1
     * @param {string} [accountData.address_line2] - Address line 2
     * @param {string} [accountData.city] - City
     * @param {string} [accountData.state] - State
     * @param {string} [accountData.zip] - ZIP code
     * @param {string} [accountData.phone] - Phone number
     * @param {string} [accountData.email] - Email address
     * @param {string} [accountData.num_properties] - Number of properties managed: '1', '2-5', '6-10', '11-25', '26-50', '50+'
     * @returns {Promise<Object>} Created account
     * @example
     * await client.createAccount({
     *   name: 'Sunset Rentals LLC',
     *   city: 'Miami',
     *   state: 'FL',
     *   num_properties: '2-5'
     * });
     */
    async createAccount(accountData) {
      return this._request('/accounts', {
        method: 'POST',
        body: accountData
      });
    }

    /**
     * Get a specific account
     * @param {string} accountId - Account ID
     * @returns {Promise<Object>} Account data
     */
    async getAccount(accountId) {
      return this._request(`/accounts/${accountId}`);
    }

    // =========================================================================
    // PROPERTIES MANAGEMENT
    // =========================================================================

    /**
     * Get all properties
     * @param {Object} [filters] - Optional filters
     * @param {string} [filters.account_id] - Filter by account ID
     * @returns {Promise<Array>} List of properties
     */
    async getProperties(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/properties?${queryParams}` : '/properties';
      return this._request(endpoint);
    }

    /**
     * Get a specific property
     * @param {string} propertyId - Property ID
     * @returns {Promise<Object>} Property data
     */
    async getProperty(propertyId) {
      return this._request(`/properties/${propertyId}`);
    }

    /**
     * Create a new property
     * @param {Object} propertyData - Property data
     * @param {string} propertyData.name - Property name (e.g., "Sunset Beach Villa")
     * @param {string} [propertyData.address_line1] - Address line 1 (e.g., "123 Ocean Drive")
     * @param {string} [propertyData.address_line2] - Address line 2 (e.g., "Apt 4B")
     * @param {string} [propertyData.city] - City (e.g., "Miami")
     * @param {string} [propertyData.state] - State (e.g., "FL")
     * @param {string} [propertyData.zip] - ZIP code (e.g., "33139")
     * @param {number} [propertyData.bedrooms] - Number of bedrooms (e.g., 3)
     * @param {number} [propertyData.bathrooms] - Number of bathrooms (e.g., 2.5)
     * @param {string} [propertyData.property_type] - Property type: house, townhouse, condo, apartment, villa, cottage, houseboat, other
     * @param {string} [propertyData.phone] - Property phone number (e.g., "+1-555-123-4567")
     * @param {string} [propertyData.wifi_ssid] - WiFi network name (e.g., "SunsetVilla-Guest")
     * @param {string} [propertyData.wifi_password] - WiFi password (e.g., "Welcome2023")
     * @param {string} [propertyData.timezone] - Timezone (e.g., "America/New_York")
     * @param {string} [propertyData.default_checkin_time] - Default check-in time in HH:MM format (e.g., "16:00")
     * @param {string} [propertyData.default_checkout_time] - Default check-out time in HH:MM format (e.g., "10:00")
     * @returns {Promise<Object>} Created property
     * @example
     * await client.createProperty({
     *   name: 'Sunset Beach Villa',
     *   address_line1: '123 Ocean Drive',
     *   city: 'Miami',
     *   state: 'FL',
     *   zip: '33139',
     *   bedrooms: 3,
     *   bathrooms: 2.5,
     *   property_type: 'villa',
     *   wifi_ssid: 'SunsetVilla-Guest',
     *   wifi_password: 'Welcome2023',
     *   timezone: 'America/New_York',
     *   default_checkin_time: '16:00',
     *   default_checkout_time: '10:00'
     * });
     */
    async createProperty(propertyData) {
      return this._request('/properties', {
        method: 'POST',
        body: propertyData
      });
    }

    /**
     * Update a property
     * @param {string} propertyId - Property ID
     * @param {Object} updates - Property updates
     * @param {string} [updates.name] - Property name
     * @param {string} [updates.address_line1] - Address line 1
     * @param {string} [updates.address_line2] - Address line 2
     * @param {string} [updates.city] - City
     * @param {string} [updates.state] - State
     * @param {string} [updates.zip] - ZIP code
     * @param {number} [updates.bedrooms] - Number of bedrooms
     * @param {number} [updates.bathrooms] - Number of bathrooms
     * @param {string} [updates.property_type] - Property type: house, townhouse, condo, apartment, villa, cottage, houseboat, other
     * @param {string} [updates.phone] - Property phone number
     * @param {string} [updates.wifi_ssid] - WiFi network name
     * @param {string} [updates.wifi_password] - WiFi password
     * @param {string} [updates.timezone] - Timezone
     * @param {string} [updates.default_checkin_time] - Default check-in time in HH:MM format (e.g., "16:00")
     * @param {string} [updates.default_checkout_time] - Default check-out time in HH:MM format (e.g., "10:00")
     * @returns {Promise<Object>} Updated property
     */
    async updateProperty(propertyId, updates) {
      return this._request(`/properties/${propertyId}`, {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Delete a property
     * @param {string} propertyId - Property ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteProperty(propertyId) {
      return this._request(`/properties/${propertyId}`, {
        method: 'DELETE'
      });
    }

    // =========================================================================
    // ROOMS MANAGEMENT
    // =========================================================================

    /**
     * Get all rooms for a property
     * Requires Pro or Enterprise subscription
     * @param {string} propertyId - Property ID
     * @returns {Promise<Array>} List of rooms
     */
    async getPropertyRooms(propertyId) {
      return this._request(`/properties/${propertyId}/rooms`);
    }

    /**
     * Get a specific room
     * Requires Pro or Enterprise subscription
     * @param {string} roomId - Room ID
     * @returns {Promise<Object>} Room data
     */
    async getRoom(roomId) {
      return this._request(`/rooms/${roomId}`);
    }

    /**
     * Create a new room for a property
     * Requires Pro or Enterprise subscription
     * @param {string} propertyId - Property ID
     * @param {Object} roomData - Room data
     * @param {string} roomData.name - Room name (e.g., "Living Room", "Master Bedroom")
     * @param {string} [roomData.description] - Optional room description
     * @returns {Promise<Object>} Created room
     */
    async createRoom(propertyId, roomData) {
      return this._request(`/properties/${propertyId}/rooms`, {
        method: 'POST',
        body: roomData
      });
    }

    /**
     * Update a room
     * Requires Pro or Enterprise subscription
     * @param {string} roomId - Room ID
     * @param {Object} updates - Room updates
     * @param {string} [updates.name] - Room name
     * @param {string} [updates.description] - Room description
     * @returns {Promise<Object>} Updated room
     */
    async updateRoom(roomId, updates) {
      return this._request(`/rooms/${roomId}`, {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Delete a room
     * Devices assigned to this room will have their room_id set to null
     * Requires Pro or Enterprise subscription
     * @param {string} roomId - Room ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteRoom(roomId) {
      return this._request(`/rooms/${roomId}`, {
        method: 'DELETE'
      });
    }

    // =========================================================================
    // DEVICES MANAGEMENT (User-side)
    // =========================================================================

    /**
     * Get all devices for the user
     * @returns {Promise<Array>} List of devices
     */
    async getDevices() {
      return this._request('/devices');
    }

    /**
     * Get a specific device
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object>} Device data
     */
    async getDevice(deviceId) {
      return this._request(`/devices/${deviceId}`);
    }

    /**
     * Get all devices for a specific property
     * @param {string} propertyId - Property ID
     * @returns {Promise<Array>} List of devices
     */
    async getPropertyDevices(propertyId) {
      return this._request(`/properties/${propertyId}/devices`);
    }

    /**
     * Update a device
     * @param {string} deviceId - Device ID
     * @param {Object} updates - Device updates
     * @param {string} [updates.name] - Device name
     * @param {string} [updates.location] - Device location
     * @param {string} [updates.platform] - Device platform
     * @returns {Promise<Object>} Updated device
     */
    async updateDevice(deviceId, updates) {
      return this._request(`/devices/${deviceId}`, {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Delete a device
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteDevice(deviceId) {
      return this._request(`/devices/${deviceId}`, {
        method: 'DELETE'
      });
    }

    /**
     * Get device preview URL
     * Returns a URL with authentication credentials for previewing the device display
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object>} Preview data with preview_url, device_id, device_identifier
     */
    async getDevicePreview(deviceId) {
      return this._request(`/devices/${deviceId}/preview`);
    }

    // =========================================================================
    // DEVICE PAIRING (Public endpoints)
    // =========================================================================

    /**
     * Generate a pairing code for a device (no authentication required)
     * @param {string} deviceIdentifier - Unique device identifier (serial, MAC, etc.)
     * @returns {Promise<Object>} Pairing code data
     */
    async generatePairingCode(deviceIdentifier) {
      return this._request(`/pairing/code?device_identifier=${encodeURIComponent(deviceIdentifier)}`, {
        auth: false
      });
    }

    /**
     * Verify if a pairing code is valid (no authentication required)
     * @param {string} code - Pairing code
     * @returns {Promise<Object>} Code validity information
     */
    async verifyPairingCode(code) {
      return this._request(`/pairing/verify/${code}`, {
        auth: false
      });
    }

    /**
     * Register a device using a pairing code
     * @param {Object} registrationData - Registration data
     * @param {string} registrationData.code - Pairing code
     * @param {string} registrationData.property_id - Property ID
     * @param {string} registrationData.platform - Device platform (roku, android, firetv, etc.)
     * @param {string} [registrationData.name] - Optional device name (e.g., "Living Room TV")
     * @returns {Promise<Object>} Device data with device_token
     */
    async registerDevice(registrationData) {
      const data = await this._request('/devices/register', {
        method: 'POST',
        body: registrationData
      });

      // Store device token if this is a device client
      if (data.device_token) {
        this.deviceToken = data.device_token;
      }

      return data;
    }

    // =========================================================================
    // DEVICE API (Device-authenticated endpoints)
    // =========================================================================

    /**
     * Send a heartbeat from the device (requires device token)
     * @returns {Promise<Object>} Heartbeat confirmation
     */
    async deviceHeartbeat() {
      return this._request('/device/heartbeat', {
        method: 'POST',
        useDeviceToken: true
      });
    }

    /**
     * Get device's own information and configuration (requires device token)
     * If a 401 error occurs, clears tokens and triggers onDeviceSessionInvalid callback
     * @returns {Promise<Object>} Device and property information
     */
    async getDeviceInfo() {
      try {
        return await this._request('/device/info', {
          useDeviceToken: true
        });
      } catch (error) {
        // Handle 401 - session is invalid, need to re-pair
        if (error.status === 401) {
          console.error('Device session invalid on /device/info, triggering re-pairing');
          console.log('Current storage:', this.storage ? 'configured' : 'not configured');
          console.log('Storage key:', this.storageKey);

          // Clear tokens and trigger session invalidation callback
          this.clearTokens();

          console.log('Tokens cleared, calling onDeviceSessionInvalid callback');

          if (this.onDeviceSessionInvalid) {
            this.onDeviceSessionInvalid();
          } else {
            // Default behavior: refresh the page to restart pairing process
            console.log('No onDeviceSessionInvalid callback configured, refreshing page');
            if (typeof window !== 'undefined' && window.location) {
              window.location.reload();
            }
          }
        }
        throw error;
      }
    }

    /**
     * Get device content for display (requires device token)
     * Returns content grouped by type (e.g., message, background, house_rules)
     * Content is prioritized: device-specific > room-specific > property-wide
     * @returns {Promise<Object>} Content data with device_id, content (grouped by type), and last_updated
     * @example
     * const result = await client.getDeviceContent();
     * // result.content.message[0].data.title - Welcome message title
     * // result.content.message[0].data.body - Welcome message body
     * // result.content.background[0].data.url - Background image URL
     */
    async getDeviceContent() {
      return this._request('/device/content', {
        useDeviceToken: true
      });
    }

    /**
     * Set device token for device-authenticated requests
     * @param {string} deviceToken - Device token from registration
     */
    setDeviceToken(deviceToken) {
      this.deviceToken = deviceToken;
    }

    /**
     * Start automatic heartbeat for device
     * @param {number} [intervalMs=60000] - Interval in milliseconds (default: 1 minute)
     * @returns {number} Interval ID (use with stopDeviceHeartbeat)
     */
    startDeviceHeartbeat(intervalMs = 60000) {
      return setInterval(async () => {
        try {
          await this.deviceHeartbeat();
        } catch (error) {
          console.error('Device heartbeat failed:', error);

          // Handle 401 - try to recover by checking device info
          if (error.status === 401) {
            try {
              // Retry with device/info to verify if session is still valid
              // If this also returns 401, getDeviceInfo will handle clearing tokens
              // and calling onDeviceSessionInvalid
              await this.getDeviceInfo();
              // If getDeviceInfo succeeds, the heartbeat failure was transient
              console.log('Device session recovered via /device/info');
            } catch (infoError) {
              // getDeviceInfo handles 401 internally (clears tokens, calls callback)
              // Just log non-401 errors here
              if (infoError.status !== 401) {
                console.error('Device info check failed:', infoError);
              }
            }
          }
        }
      }, intervalMs);
    }

    /**
     * Stop automatic heartbeat
     * @param {number} intervalId - Interval ID from startDeviceHeartbeat
     */
    stopDeviceHeartbeat(intervalId) {
      clearInterval(intervalId);
    }

    // =========================================================================
    // BOOKINGS MANAGEMENT
    // =========================================================================

    /**
     * Get all bookings across all properties
     * @param {Object} [filters] - Optional filters
     * @param {string} [filters.status] - Filter by status: confirmed, cancelled, completed, in_progress
     * @returns {Promise<Array>} List of bookings
     */
    async getBookings(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/bookings?${queryParams}` : '/bookings';
      return this._request(endpoint);
    }

    /**
     * Get upcoming bookings across all properties
     * @returns {Promise<Array>} List of upcoming bookings
     */
    async getUpcomingBookings() {
      return this._request('/bookings/upcoming');
    }

    /**
     * Get bookings for a specific property
     * @param {string} propertyId - Property ID
     * @param {Object} [filters] - Optional filters
     * @param {string} [filters.start_date] - Start date (YYYY-MM-DD)
     * @param {string} [filters.end_date] - End date (YYYY-MM-DD)
     * @param {string} [filters.status] - Filter by status
     * @returns {Promise<Array>} List of bookings
     */
    async getPropertyBookings(propertyId, filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams
        ? `/properties/${propertyId}/bookings?${queryParams}`
        : `/properties/${propertyId}/bookings`;
      return this._request(endpoint);
    }

    /**
     * Get a specific booking
     * @param {string} propertyId - Property ID
     * @param {string} bookingId - Booking ID
     * @returns {Promise<Object>} Booking data
     */
    async getBooking(propertyId, bookingId) {
      return this._request(`/properties/${propertyId}/bookings/${bookingId}`);
    }

    /**
     * Create a new booking
     * @param {string} propertyId - Property ID
     * @param {Object} bookingData - Booking data
     * @param {string} bookingData.check_in - Check-in date (YYYY-MM-DD)
     * @param {string} bookingData.check_out - Check-out date (YYYY-MM-DD)
     * @param {string} [bookingData.guest_name] - Guest name
     * @param {string} [bookingData.guest_email] - Guest email
     * @param {string} [bookingData.guest_phone] - Guest phone
     * @param {number} [bookingData.num_guests] - Number of guests
     * @param {string} [bookingData.status] - Status: confirmed, cancelled, completed, in_progress
     * @param {string} [bookingData.source] - Booking source (e.g., airbnb, vrbo)
     * @param {string} [bookingData.pms_booking_id] - External PMS booking ID
     * @returns {Promise<Object>} Created booking
     */
    async createBooking(propertyId, bookingData) {
      return this._request(`/properties/${propertyId}/bookings`, {
        method: 'POST',
        body: bookingData
      });
    }

    /**
     * Update a booking
     * @param {string} propertyId - Property ID
     * @param {string} bookingId - Booking ID
     * @param {Object} updates - Booking updates
     * @returns {Promise<Object>} Updated booking
     */
    async updateBooking(propertyId, bookingId, updates) {
      return this._request(`/properties/${propertyId}/bookings/${bookingId}`, {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Delete a booking
     * @param {string} propertyId - Property ID
     * @param {string} bookingId - Booking ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteBooking(propertyId, bookingId) {
      return this._request(`/properties/${propertyId}/bookings/${bookingId}`, {
        method: 'DELETE'
      });
    }

    /**
     * Get current active booking for a property
     * @param {string} propertyId - Property ID
     * @returns {Promise<Object>} Current booking or null
     */
    async getCurrentBooking(propertyId) {
      return this._request(`/properties/${propertyId}/bookings/current`);
    }

    // =========================================================================
    // CONTENT MANAGEMENT
    // =========================================================================

    /**
     * Get all content across all properties
     * @returns {Promise<Array>} List of content items
     */
    async getContent() {
      return this._request('/content');
    }

    /**
     * Get a specific content item
     * @param {string} contentId - Content item ID
     * @returns {Promise<Object>} Content item data
     */
    async getContentItem(contentId) {
      return this._request(`/content/${contentId}`);
    }

    /**
     * Create a new content item
     * @param {Object} contentData - Content data
     * @param {string} contentData.property_id - Property ID (required)
     * @param {string} contentData.content_type - Type of content, e.g., 'welcome_message', 'house_rules' (required)
     * @param {string} [contentData.room_id] - Optional room targeting
     * @param {string} [contentData.device_id] - Optional device targeting
     * @param {Object} [contentData.data] - Content data (structure varies by content_type)
     * @returns {Promise<Object>} Created content item
     * @example
     * await client.createContent({
     *   property_id: '550e8400-e29b-41d4-a716-446655440000',
     *   content_type: 'welcome_message',
     *   data: {
     *     message: 'Welcome to our vacation home!'
     *   }
     * });
     */
    async createContent(contentData) {
      return this._request('/content', {
        method: 'POST',
        body: contentData
      });
    }

    /**
     * Update a content item
     * @param {string} contentId - Content item ID
     * @param {Object} updates - Content updates
     * @param {string} [updates.room_id] - Update room targeting (null to clear)
     * @param {string} [updates.device_id] - Update device targeting (null to clear)
     * @param {string} [updates.content_type] - Update content type
     * @param {Object} [updates.data] - Update content data
     * @returns {Promise<Object>} Updated content item
     */
    async updateContent(contentId, updates) {
      return this._request(`/content/${contentId}`, {
        method: 'PUT',
        body: updates
      });
    }

    /**
     * Delete a content item
     * @param {string} contentId - Content item ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteContent(contentId) {
      return this._request(`/content/${contentId}`, {
        method: 'DELETE'
      });
    }

    /**
     * Get all content for a specific property
     * @param {string} propertyId - Property ID
     * @returns {Promise<Array>} List of content items
     */
    async getPropertyContent(propertyId) {
      return this._request(`/properties/${propertyId}/content`);
    }

    /**
     * Get content of a specific type for a property
     * @param {string} propertyId - Property ID
     * @param {string} contentType - Content type to filter by (e.g., 'welcome_message', 'house_rules')
     * @returns {Promise<Array>} List of content items of the specified type
     */
    async getPropertyContentByType(propertyId, contentType) {
      return this._request(`/properties/${propertyId}/content/${contentType}`);
    }

    // =========================================================================
    // SUBSCRIPTIONS & BILLING
    // =========================================================================

    /**
     * Get current user's subscription details with limits and usage
     * @returns {Promise<Object>} Subscription details with tier, limits, features, and usage
     */
    async getSubscription() {
      return this._request('/subscriptions');
    }

    /**
     * Create a new subscription (Free → Paid upgrade)
     * @param {Object} subscriptionData - Subscription data
     * @param {string} subscriptionData.plan - Plan tier: basic, pro, enterprise
     * @param {string} subscriptionData.payment_token - Stripe payment method token from Stripe Elements (pm_xxx)
     * @returns {Promise<Object>} Created subscription with plan, status, and current_period_end
     */
    async createSubscription(subscriptionData) {
      return this._request('/subscriptions/subscribe', {
        method: 'POST',
        body: subscriptionData
      });
    }

    /**
     * Cancel subscription (Paid → Free downgrade)
     * @param {boolean} [immediate=false] - If true, cancel immediately; if false, cancel at period end
     * @returns {Promise<Object>} Cancellation confirmation with cancel_at_period_end and access_until
     */
    async cancelSubscription(immediate = false) {
      return this._request('/subscriptions/cancel', {
        method: 'POST',
        body: { immediate }
      });
    }

    /**
     * Reactivate a cancelled subscription
     * Removes the scheduled cancellation and continues the subscription
     * @returns {Promise<Object>} Reactivation confirmation
     */
    async reactivateSubscription() {
      return this._request('/subscriptions/reactivate', {
        method: 'POST'
      });
    }

    /**
     * Get billing invoices
     * @returns {Promise<Array>} List of invoices
     */
    async getInvoices() {
      return this._request('/billing/invoices');
    }

    /**
     * Get payment methods
     * @returns {Promise<Array>} List of payment methods
     */
    async getPaymentMethods() {
      return this._request('/billing/payment-methods');
    }

    /**
     * Add a new payment method
     * @param {Object} paymentMethodData - Payment method data
     * @param {string} paymentMethodData.payment_method_id - Stripe payment method ID
     * @param {boolean} [paymentMethodData.set_as_default] - Set as default payment method
     * @returns {Promise<Object>} Added payment method
     */
    async addPaymentMethod(paymentMethodData) {
      return this._request('/billing/payment-methods', {
        method: 'POST',
        body: paymentMethodData
      });
    }

    /**
     * Remove a payment method
     * @param {string} paymentMethodId - Payment method ID
     * @returns {Promise<Object>} Removal confirmation
     */
    async removePaymentMethod(paymentMethodId) {
      return this._request(`/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      });
    }

    /**
     * Get Stripe customer portal URL for managing subscription
     * @returns {Promise<Object>} Object with portal URL
     */
    async getBillingPortalUrl() {
      return this._request('/billing/portal', {
        method: 'POST'
      });
    }

    /**
     * Change subscription plan (upgrade or downgrade)
     * @param {string} newPlan - New plan tier: basic, pro, enterprise
     * @returns {Promise<Object>} Updated subscription with plan and status
     */
    async changePlan(newPlan) {
      return this._request('/subscriptions/plan', {
        method: 'PUT',
        body: { new_plan: newPlan }
      });
    }

    /**
     * Purchase Lifetime Founder plan (one-time payment)
     * @param {string} paymentToken - Stripe payment method token from Stripe Elements (pm_xxx)
     * @returns {Promise<Object>} Lifetime subscription confirmation
     */
    async purchaseLifetimePlan(paymentToken) {
      return this._request('/subscriptions/lifetime', {
        method: 'POST',
        body: { payment_token: paymentToken }
      });
    }

    // =========================================================================
    // PRICING (Public endpoints - no authentication required)
    // =========================================================================

    /**
     * Get all available subscription plans with pricing and features
     * Public endpoint - no authentication required
     * @returns {Promise<Object>} Object with plans array and metadata
     */
    async getPricingPlans() {
      return this._request('/pricing/plans', {
        auth: false
      });
    }

    /**
     * Get a specific subscription plan by ID
     * Public endpoint - no authentication required
     * @param {string} planId - Plan ID (free, basic, pro, enterprise, lifetime_founder)
     * @returns {Promise<Object>} Plan details with pricing, limits, and features
     */
    async getPricingPlan(planId) {
      return this._request(`/pricing/plans/${planId}`, {
        auth: false
      });
    }

    /**
     * Get feature comparison matrix for all plans
     * Public endpoint - no authentication required
     * @returns {Promise<Object>} Comparison matrix with plans and features
     */
    async getPricingComparison() {
      return this._request('/pricing/compare', {
        auth: false
      });
    }

    /**
     * Get lifetime founder plan availability status
     * Public endpoint - no authentication required
     * @returns {Promise<Object>} Availability status with purchase count, remaining slots, and expiration
     */
    async getLifetimeAvailability() {
      return this._request('/pricing/availability/lifetime', {
        auth: false
      });
    }

    // =========================================================================
    // UTILITY METHODS FOR LIMITS AND PRICING
    // =========================================================================

    /**
     * Check if a limit value represents unlimited
     * In the API, -1 represents unlimited while null means not applicable
     * @param {number|null} value - Limit value from API
     * @returns {boolean} True if the limit is unlimited (-1)
     */
    isUnlimited(value) {
      return value === -1;
    }

    /**
     * Check if a limit value is not applicable (null)
     * @param {number|null} value - Limit value from API
     * @returns {boolean} True if the limit is null (not applicable)
     */
    isLimitNotApplicable(value) {
      return value === null;
    }

    /**
     * Format a limit value for display
     * Converts -1 to "Unlimited", null to "N/A", and numbers to formatted strings
     * @param {number|null} value - Limit value from API
     * @param {string} [unlimitedText='Unlimited'] - Text to display for unlimited
     * @param {string} [naText='N/A'] - Text to display for null/not applicable
     * @returns {string} Formatted limit string
     */
    formatLimit(value, unlimitedText = 'Unlimited', naText = 'N/A') {
      if (value === null) {
        return naText;
      }
      if (value === -1) {
        return unlimitedText;
      }
      return value.toLocaleString();
    }

    /**
     * Format a price value for display
     * Handles null (not applicable) and formats currency
     * @param {number|null} value - Price value from API
     * @param {string} [currency='$'] - Currency symbol
     * @param {string} [naText='N/A'] - Text to display for null/not applicable
     * @returns {string} Formatted price string
     */
    formatPrice(value, currency = '$', naText = 'N/A') {
      if (value === null) {
        return naText;
      }
      if (value === 0) {
        return 'Free';
      }
      return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }

    /**
     * Check if usage is within limit
     * Returns true if usage is under the limit or if limit is unlimited (-1)
     * @param {number} usage - Current usage count
     * @param {number|null} limit - Limit value from API
     * @returns {boolean} True if within limit
     */
    isWithinLimit(usage, limit) {
      if (limit === null) {
        return false; // Not applicable means feature not available
      }
      if (limit === -1) {
        return true; // Unlimited
      }
      return usage < limit;
    }

    /**
     * Get remaining capacity for a limit
     * @param {number} usage - Current usage count
     * @param {number|null} limit - Limit value from API
     * @returns {number|null} Remaining capacity, -1 for unlimited, null for N/A
     */
    getRemainingCapacity(usage, limit) {
      if (limit === null) {
        return null; // Not applicable
      }
      if (limit === -1) {
        return -1; // Unlimited
      }
      return Math.max(0, limit - usage);
    }
  }

  /**
   * Helper function to create a WelcomeSign client with storage persistence
   * Automatically saves and loads tokens from localStorage (browser) or custom storage
   * @param {Object} options - Configuration options
   * @param {string} options.baseURL - API base URL
   * @param {Object} [options.storage] - Custom storage implementation (must have getItem/setItem/removeItem)
   * @returns {WelcomeSignClient} Client instance with persistence
   */
  function createClient(options) {
    const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const storageKey = options.storageKey || 'welcomesign_tokens';

    // Load saved tokens
    let savedTokens = {};
    if (storage) {
      try {
        const saved = storage.getItem(storageKey);
        if (saved) {
          savedTokens = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Failed to load saved tokens:', error);
      }
    }

    // Create client with saved tokens and storage reference
    const client = new WelcomeSignClient({
      ...options,
      token: savedTokens.token,
      refreshToken: savedTokens.refreshToken,
      deviceToken: savedTokens.deviceToken,
      storage: storage,
      storageKey: storageKey,
      onTokenRefresh: (tokens) => {
        // Save tokens when refreshed
        if (storage) {
          try {
            storage.setItem(storageKey, JSON.stringify(tokens));
          } catch (error) {
            console.error('Failed to save tokens:', error);
          }
        }

        // Call user's callback if provided
        if (options.onTokenRefresh) {
          options.onTokenRefresh(tokens);
        }
      },
      onAuthError: options.onAuthError,
      onDeviceSessionInvalid: options.onDeviceSessionInvalid
    });

    // Override login/register to save tokens
    const originalLogin = client.login.bind(client);
    const originalRegister = client.register.bind(client);
    const originalSetTokens = client.setTokens.bind(client);
    const originalClearTokens = client.clearTokens.bind(client);
    const originalSetDeviceToken = client.setDeviceToken.bind(client);

    client.login = async (...args) => {
      const result = await originalLogin(...args);
      if (storage) {
        storage.setItem(storageKey, JSON.stringify(client.getTokens()));
      }
      return result;
    };

    client.register = async (...args) => {
      const result = await originalRegister(...args);
      if (storage) {
        storage.setItem(storageKey, JSON.stringify(client.getTokens()));
      }
      return result;
    };

    client.setTokens = (...args) => {
      originalSetTokens(...args);
      if (storage) {
        storage.setItem(storageKey, JSON.stringify(client.getTokens()));
      }
    };

    client.setDeviceToken = (deviceToken) => {
      originalSetDeviceToken(deviceToken);
      if (storage) {
        storage.setItem(storageKey, JSON.stringify(client.getTokens()));
      }
    };

    client.clearTokens = () => {
      originalClearTokens();
      if (storage) {
        storage.removeItem(storageKey);
      }
    };

    return client;
  }

  // Export
  return {
    WelcomeSignClient,
    createClient
  };

}));
