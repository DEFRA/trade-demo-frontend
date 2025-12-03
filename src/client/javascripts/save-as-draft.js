/**
 * Save as Draft functionality
 * Handles async save of import journey data without page refresh
 */

document.addEventListener('DOMContentLoaded', function () {
  const saveAsDraftButton = document.getElementById('save-as-draft-button')
  if (!saveAsDraftButton) return // Exit if button not found on this page

  // Create notification banner container (initially hidden)
  const createNotificationBanner = () => {
    const existingBanner = document.getElementById('draft-notification-banner')
    if (existingBanner) {
      existingBanner.remove()
    }

    const banner = document.createElement('div')
    banner.id = 'draft-notification-banner'
    banner.className = 'govuk-notification-banner'
    banner.setAttribute('role', 'region')
    banner.setAttribute('aria-live', 'polite')
    banner.style.display = 'none'

    // Insert at the top of main content
    const mainContent = document.querySelector('.govuk-grid-row')
    if (mainContent) {
      mainContent.insertBefore(banner, mainContent.firstChild)
    }

    return banner
  }

  // Show success notification
  const showSuccessNotification = (message) => {
    const banner = createNotificationBanner()
    banner.className =
      'govuk-notification-banner govuk-notification-banner--success'
    banner.setAttribute('role', 'alert')
    banner.innerHTML = `
      <div class="govuk-notification-banner__header">
        <h2 class="govuk-notification-banner__title" id="govuk-notification-banner-title">
          Success
        </h2>
      </div>
      <div class="govuk-notification-banner__content">
        <p class="govuk-notification-banner__heading">
          ${message}
        </p>
      </div>
    `
    banner.style.display = 'block'

    // Scroll to top to show notification
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Auto-hide after 5 seconds
    setTimeout(() => {
      banner.style.display = 'none'
    }, 5000)
  }

  // Show error notification
  const showErrorNotification = (message) => {
    const banner = createNotificationBanner()
    banner.className = 'govuk-notification-banner'
    banner.setAttribute('role', 'alert')
    banner.innerHTML = `
      <div class="govuk-notification-banner__header">
        <h2 class="govuk-notification-banner__title" id="govuk-notification-banner-title">
          Important
        </h2>
      </div>
      <div class="govuk-notification-banner__content">
        <p class="govuk-notification-banner__heading">
          ${message}
        </p>
      </div>
    `
    banner.style.display = 'block'

    // Scroll to top to show notification
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Auto-hide after 8 seconds (longer for errors)
    setTimeout(() => {
      banner.style.display = 'none'
    }, 8000)
  }

  // Capture current form values from the page
  const captureFormData = () => {
    const formData = {}

    // Find all forms on the page
    const forms = document.querySelectorAll('form')
    console.log('Found forms:', forms.length)

    forms.forEach((form) => {
      const inputs = form.querySelectorAll('input, select, textarea')
      console.log('Found inputs in form:', inputs.length)

      inputs.forEach((input) => {
        const name = input.name
        const value = input.value

        console.log('Processing input:', { name, value, type: input.type })

        // Skip CSRF token and empty values
        if (name && name !== 'crumb' && value) {
          // Handle checkboxes and radio buttons
          if (input.type === 'checkbox' || input.type === 'radio') {
            if (input.checked) {
              // For checkboxes that allow multiple selections
              if (formData[name]) {
                if (Array.isArray(formData[name])) {
                  formData[name].push(value)
                } else {
                  formData[name] = [formData[name], value]
                }
              } else {
                formData[name] = value
              }
            }
          } else {
            formData[name] = value
          }
        }
      })
    })

    return formData
  }

  // Handle Save as Draft button click
  saveAsDraftButton.addEventListener('click', async function (event) {
    event.preventDefault()

    // Disable button and show loading state
    saveAsDraftButton.disabled = true
    const originalText = saveAsDraftButton.textContent
    saveAsDraftButton.textContent = 'Saving...'

    // Capture current form values
    const formData = captureFormData()

    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    // Debug logging
    console.log('Captured form data:', formData)

    try {
      const response = await fetch('/import/save-as-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'same-origin', // Include session cookie
        body: JSON.stringify({ formData })
      })

      console.log('Response status:', response.status)

      const data = await response.json()

      if (response.ok && data.success) {
        showSuccessNotification(
          'Your draft has been saved. You can continue editing or return later.'
        )
      } else {
        showErrorNotification(
          data.message || 'Failed to save draft. Please try again.'
        )
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      showErrorNotification(
        'Failed to save draft due to a network error. Please try again.'
      )
    } finally {
      // Re-enable button and restore text
      saveAsDraftButton.disabled = false
      saveAsDraftButton.textContent = originalText
    }
  })
})
