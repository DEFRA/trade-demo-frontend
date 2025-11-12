export function buildNavigation(request, authData) {
  return [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'About',
      href: '/about',
      current: request?.path === '/about'
    },
    {
      text: 'Dashboard',
      href: '/dashboard',
      current: request?.path === '/dashboard'
    }
  ]
}
