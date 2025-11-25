/**
 * BCP Autocomplete functionality
 * Provides dynamic search and selection of Border Control Posts
 */

;(function () {
  // Only run if we're on the BCP page
  const bcpSearchInput = document.getElementById('bcp-search')
  if (!bcpSearchInput) return

  const suggestionsContainer = document.getElementById('bcp-suggestions')
  let currentFocus = -1
  let debounceTimer
  let bcpData = []

  // Fetch initial BCP data
  fetch('/import/bcp/api')
    .then((response) => response.json())
    .then((data) => {
      bcpData = data
    })
    .catch((error) => {
      console.error('Error fetching BCP data:', error)
    })

  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(debounceTimer)
        func(...args)
      }
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(later, wait)
    }
  }

  function filterBCPs(query) {
    if (query.length < 3) {
      hideSuggestions()
      return
    }

    const filtered = bcpData.filter(
      (bcp) =>
        (bcp.name && bcp.name.toLowerCase().includes(query.toLowerCase())) ||
        (bcp.code && bcp.code.toLowerCase().includes(query.toLowerCase()))
    )

    showSuggestions(filtered, query)
  }

  function showSuggestions(suggestions, query) {
    currentFocus = -1

    if (suggestions.length === 0) {
      suggestionsContainer.innerHTML =
        '<div class="autocomplete-suggestion no-results">No BCP Found</div>'
      suggestionsContainer.style.display = 'block'
      return
    }

    const suggestionHTML = suggestions
      .map((bcp, index) => {
        const highlightedName = (bcp.name || '').replace(
          new RegExp(query, 'gi'),
          (match) => `<strong>${match}</strong>`
        )
        const highlightedCode = (bcp.code || '').replace(
          new RegExp(query, 'gi'),
          (match) => `<strong>${match}</strong>`
        )

        return `
        <div class="autocomplete-suggestion" data-index="${index}"
          data-value="${bcp.name || bcp.code}" data-code="${bcp.code || ''}">
          <div class="bcp-name">${highlightedName}</div>
          ${bcp.code ? `<div class="bcp-code">${highlightedCode}</div>` : ''}
        </div>
      `
      })
      .join('')

    suggestionsContainer.innerHTML = suggestionHTML
    suggestionsContainer.style.display = 'block'

    // Add click handlers
    suggestionsContainer
      .querySelectorAll('.autocomplete-suggestion')
      .forEach((suggestion, index) => {
        suggestion.addEventListener('click', () => selectSuggestion(index))
      })
  }

  function hideSuggestions() {
    suggestionsContainer.style.display = 'none'
    currentFocus = -1
  }

  function selectSuggestion(index) {
    const suggestions = suggestionsContainer.querySelectorAll(
      '.autocomplete-suggestion'
    )
    if (
      suggestions[index] &&
      !suggestions[index].classList.contains('no-results')
    ) {
      bcpSearchInput.value = suggestions[index].getAttribute('data-value')
      hideSuggestions()
    }
  }

  function addActive(suggestions) {
    removeActive(suggestions)
    if (currentFocus >= suggestions.length) currentFocus = 0
    if (currentFocus < 0) currentFocus = suggestions.length - 1
    if (suggestions[currentFocus]) {
      suggestions[currentFocus].classList.add('autocomplete-suggestion-active')
    }
  }

  function removeActive(suggestions) {
    suggestions.forEach((suggestion) => {
      suggestion.classList.remove('autocomplete-suggestion-active')
    })
  }

  // Event listeners
  bcpSearchInput.addEventListener(
    'input',
    debounce(function (e) {
      filterBCPs(e.target.value)
    }, 300)
  )

  bcpSearchInput.addEventListener('keydown', function (e) {
    const suggestions = suggestionsContainer.querySelectorAll(
      '.autocomplete-suggestion:not(.no-results)'
    )

    if (e.keyCode === 40) {
      // Down arrow
      e.preventDefault()
      currentFocus++
      addActive(suggestions)
    } else if (e.keyCode === 38) {
      // Up arrow
      e.preventDefault()
      currentFocus--
      addActive(suggestions)
    } else if (e.keyCode === 13) {
      // Enter
      e.preventDefault()
      if (currentFocus > -1 && suggestions[currentFocus]) {
        selectSuggestion(currentFocus)
      }
    } else if (e.keyCode === 27) {
      // Escape
      hideSuggestions()
    }
  })

  // Hide suggestions when clicking outside
  document.addEventListener('click', function (e) {
    if (
      !bcpSearchInput.contains(e.target) &&
      !suggestionsContainer.contains(e.target)
    ) {
      hideSuggestions()
    }
  })
})()
