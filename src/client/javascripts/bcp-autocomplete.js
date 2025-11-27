/**
 * BCP Autocomplete functionality
 * Provides type-ahead search for Border Control Posts
 */

document.addEventListener('DOMContentLoaded', function() {
  const bcpInput = document.getElementById('bcp');
  if (!bcpInput) return; // Exit if BCP input not found on this page
  
  const form = bcpInput.closest('.govuk-form-group');
  let suggestionsList = null;
  let currentFocus = -1;
  let debounceTimer = null;

  function createSuggestionsList() {
    if (suggestionsList) {
      suggestionsList.remove();
    }
    suggestionsList = document.createElement('div');
    suggestionsList.className = 'autocomplete-suggestions';
    suggestionsList.style.display = 'none';
    form.appendChild(suggestionsList);
  }

  function showSuggestions(suggestions) {
    if (!suggestionsList) {
      createSuggestionsList();
    }

    suggestionsList.innerHTML = '';
    currentFocus = -1;

    if (suggestions.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'autocomplete-suggestion no-results';
      noResults.textContent = 'No matching BCPs found';
      suggestionsList.appendChild(noResults);
    } else {
      suggestions.forEach((bcp, index) => {
        const suggestion = document.createElement('div');
        suggestion.className = 'autocomplete-suggestion';
        const displayValue = `${bcp.name} - ${bcp.code}`;
        suggestion.innerHTML = `
          <div class="bcp-name">${displayValue}</div>
        `;
        suggestion.addEventListener('click', function() {
          bcpInput.value = displayValue;
          hideSuggestions();
        });
        suggestionsList.appendChild(suggestion);
      });
    }

    suggestionsList.style.display = 'block';
  }

  function hideSuggestions() {
    if (suggestionsList) {
      suggestionsList.style.display = 'none';
    }
  }

  function fetchSuggestions(query) {
    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    fetch(`/import/transport/api?q=${encodeURIComponent(query)}`)
      .then(response => response.json())
      .then(data => {
        showSuggestions(data);
      })
      .catch(error => {
        console.error('Error fetching BCP suggestions:', error);
        hideSuggestions();
      });
  }

  function updateActiveSuggestion(suggestions) {
    suggestions.forEach((suggestion, index) => {
      suggestion.classList.toggle('autocomplete-suggestion-active', index === currentFocus);
    });
  }

  // Event listeners
  bcpInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  });

  bcpInput.addEventListener('keydown', function(e) {
    if (!suggestionsList || suggestionsList.style.display === 'none') {
      return;
    }

    const suggestions = suggestionsList.querySelectorAll('.autocomplete-suggestion:not(.no-results)');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentFocus = currentFocus < suggestions.length - 1 ? currentFocus + 1 : 0;
      updateActiveSuggestion(suggestions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentFocus = currentFocus > 0 ? currentFocus - 1 : suggestions.length - 1;
      updateActiveSuggestion(suggestions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus >= 0 && suggestions[currentFocus]) {
        suggestions[currentFocus].click();
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  bcpInput.addEventListener('focus', function() {
    const query = this.value.trim();
    if (query.length >= 2) {
      fetchSuggestions(query);
    }
  });

  bcpInput.addEventListener('blur', function() {
    setTimeout(hideSuggestions, 200);
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', function(e) {
    if (!form.contains(e.target)) {
      hideSuggestions();
    }
  });
});