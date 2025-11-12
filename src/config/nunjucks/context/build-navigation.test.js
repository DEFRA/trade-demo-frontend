import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    const result = buildNavigation(
      mockRequest({ path: '/non-existent-path' }),
      null
    )

    expect(result).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      },
      {
        current: false,
        text: 'Dashboard',
        href: '/dashboard'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    const result = buildNavigation(mockRequest({ path: '/' }), null)

    expect(result).toEqual([
      {
        current: true,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      },
      {
        current: false,
        text: 'Dashboard',
        href: '/dashboard'
      }
    ])
  })

  test('Should return same navigation regardless of auth status', () => {
    const authData = {
      displayName: 'Kai Atkinson',
      email: 'kai@example.com'
    }

    const result = buildNavigation(
      mockRequest({ path: '/dashboard' }),
      authData
    )

    expect(result).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      },
      {
        current: true,
        text: 'Dashboard',
        href: '/dashboard'
      }
    ])
  })
})
