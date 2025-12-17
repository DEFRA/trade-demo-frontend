/**
 * Backend API client for trade-demo-backend
 * Implements CDP-compliant patterns:
 * - Propagates x-cdp-request-id on all requests
 * - Uses node-fetch v3 with modern async/await patterns
 * - Follows ESM module syntax
 * - Proper error handling with response.ok checks
 */

import fetch from 'node-fetch'
import { config } from '../../../config/config.js'

const baseUrl = config.get('backendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

/**
 * Create an error object from a failed response
 * @param {Response} response - fetch Response object
 * @returns {Error} Error with status and message
 */
function createError(response) {
  const error = new Error(
    `Backend API error: ${response.status} ${response.statusText}`
  )
  error.statusCode = response.status
  error.response = response
  return error
}

/**
 * API client
 * Provides CRUD operations for the Example entity
 */
export const exampleApi = {
  /**
   * Get all examples
   * @param {string} traceId - Request trace ID (x-cdp-request-id)
   * @returns {Promise<Array>} Array of example objects
   */
  async findAll(traceId) {
    const response = await fetch(`${baseUrl}/example`, {
      method: 'GET',
      headers: {
        [tracingHeader]: traceId
      }
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Get a single example by ID
   * @param {string} id - Example ID
   * @param {string} traceId - Request trace ID
   * @returns {Promise<object>} Example object
   */
  async findById(id, traceId) {
    const response = await fetch(`${baseUrl}/example/${id}`, {
      method: 'GET',
      headers: {
        [tracingHeader]: traceId
      }
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Create a new example
   * @param {object} data - Example data (name, value, counter)
   * @param {string} traceId - Request trace ID
   * @returns {Promise<object>} Created example object
   */
  async create(data, traceId) {
    const response = await fetch(`${baseUrl}/example`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Update an existing example
   * @param {string} id - Example ID
   * @param {object} data - Updated example data
   * @param {string} traceId - Request trace ID
   * @returns {Promise<object>} Updated example object
   */
  async update(id, data, traceId) {
    const response = await fetch(`${baseUrl}/example/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Delete an example
   * @param {string} id - Example ID
   * @param {string} traceId - Request trace ID
   * @returns {Promise<void>}
   */
  async delete(id, traceId) {
    const response = await fetch(`${baseUrl}/example/${id}`, {
      method: 'DELETE',
      headers: {
        [tracingHeader]: traceId
      }
    })

    if (!response.ok) {
      throw createError(response)
    }

    // DELETE returns 204 No Content, no body to parse
  }
}

/**
 * Notification API client
 * Provides draft save/update operations for import notifications
 */
export const notificationApi = {
  /**
   * Save or update a draft notification
   * Backend will:
   * - Generate ID on first save if notification.id is null
   * - Update existing notification if ID is provided
   * - Return full notification with ID in response
   *
   * @param {Object} notificationDto - NotificationDto (id can be null for first save)
   * @param {string} traceId - Request trace ID (x-cdp-request-id)
   * @returns {Promise<Object>} Complete notification with backend-generated ID
   */
  async saveDraft(notificationDto, traceId) {
    const response = await fetch(`${baseUrl}/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      },
      body: JSON.stringify(notificationDto)
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Submit a notification for final processing
   * Calls POST /notifications/submit with NotificationDto
   * Backend will mark as SUBMITTED and process accordingly
   *
   * @param {Object} notificationDto - NotificationDto to submit
   * @param {string} traceId - Request trace ID (x-cdp-request-id)
   * @returns {Promise<Object>} Submitted notification with backend status
   */
  async submitNotification(notificationDto, traceId) {
    const response = await fetch(`${baseUrl}/notifications/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      },
      body: JSON.stringify(notificationDto)
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Get all notifications
   * @param {string} traceId - Request trace ID (x-cdp-request-id)
   * @returns {Promise<Array>} Array of notification objects
   */
  async findAll(traceId) {
    const response = await fetch(`${baseUrl}/notifications`, {
      method: 'GET',
      headers: {
        [tracingHeader]: traceId
      }
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  }
}
