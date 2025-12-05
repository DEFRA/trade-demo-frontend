document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('species-search-form')
  const input = document.getElementById('species-search')
  const suggestions = document.getElementById('suggestions')

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase()

    if (query.length < 3) {
      suggestions.innerHTML = ''
      return
    }

    fetch(
      `/import/commodity/codes/species-autofill?filter=${encodeURIComponent(query)}`
    )
      .then((res) => res.json())
      .then((data) => {
        suggestions.innerHTML = ''
        data.forEach((item) => {
          const div = document.createElement('div')
          div.className = 'suggestion'
          div.textContent = item
          div.onclick = () => {
            input.value = item
            // suggestions.innerHTML = '';
            form.submit()
          }
          suggestions.appendChild(div)
        })
      })
  })

  // Optional: Submit on Enter (without Enter keypress)
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      form.submit()
    }
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.innerHTML = ''
    }
  })
})
