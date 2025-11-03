# Building an Idiomatic hapi.js Auth Module (OIDC SSO with `@hapi/bell` + Session Cookies)

> Persona: senior Node/hapi.js engineer mentoring a colleague new to Node & hapi.

This guide explains **the hapi plugin philosophy**, how **auth schemes & strategies** fit together, and a clean, **production‑ready structure** for implementing **Azure AD (OIDC) SSO** using **`@hapi/bell`** plus **session cookie protection** using **`@hapi/cookie`**. It also shows how to adapt the approach to the **DEFRA CDP Node frontend template**.

---

## 1) The hapi “plugin way”

- A **plugin** is a composable bundle of server behavior: routes, server methods, caches, request‑lifecycle extensions, and even **auth schemes/strategies**. You register multiple plugins on a server and deploy them together [6].
- Experienced teams **group features as plugins** (e.g., `auth`, `dashboard`, `admin`). Keeping each feature’s routes/config in its plugin avoids route conflicts and makes code discoverable [7].

**Rule of thumb**: your main `server.js` (or `index.js`) should be thin; **most logic lives in plugins**.

---

## 2) hapi Auth: schemes vs strategies

- An **auth scheme** is the _mechanism_ (e.g., “cookie”, “basic”, “bell” OAuth/OIDC).
- A **strategy** is a **named, configured instance** of a scheme (e.g., `strategy('session','cookie',opts)` or `strategy('azureAD','bell',opts)`) and is what routes reference [1][8].

You rarely write a scheme from scratch. Instead, install a scheme plugin and **create strategies** for your app.

---

## 3) The winning combo for OIDC SSO

- **`@hapi/bell`** handles the **OIDC/OAuth handshake** with Azure AD. It ships with a **built‑in AzureAD provider** [2][3].
- **`@hapi/cookie`** provides **session cookies** for post‑login requests. Cookie auth expects you to authenticate the user **via some other means** first (like Bell) and then **set a session**; subsequent requests are authorized from the cookie [5].

**Pattern**: _Bell_ gets identity → store what you need in a cookie via `request.cookieAuth.set(...)` → other routes use the **cookie strategy**.

---

## 4) Project structure (ideal) and mapping to CDP template

**Ideal layout** (adapt to your template):

```
src/
  plugins/
    auth/
      index.js            # registers @hapi/bell & @hapi/cookie, defines strategies, /login & /logout routes
      azure-config.js     # (optional) provider config constants (scopes, tenant, etc.)
    dashboard/
      index.js            # /dashboard routes; mark auth: 'session'
  config/                 # env-driven config (clientId, secret, cookie password)
  server.js               # create server, register plugins
```

This maps cleanly into **DEFRA’s CDP Node Frontend Template** repo structure; register your plugins during server startup in the template’s bootstrap (see the template here [10]).

---

## 5) Auth plugin: wiring Bell (Azure AD) + Cookie session

### 5.1 Plugin registration (inside `src/plugins/auth/index.js`)

```js
exports.plugin = {
  name: 'auth',
  register: async (server, options) => {
    // Ensure schemes are loaded
    await server.register(require('@hapi/bell'))
    await server.register(require('@hapi/cookie'))

    // --- Bell: Azure AD strategy ---
    server.auth.strategy('azureAD', 'bell', {
      provider: 'azuread', // or 'azure' depending on your bell version [2][3]
      // Some versions expect 'tenant' (not 'tenantId') — see note [9]
      config: { tenant: options.azureTenant },
      clientId: options.azureClientId,
      clientSecret: options.azureClientSecret,
      password: options.tempCookiePassword, // used by bell for its temporary cookie
      isSecure: options.isSecure, // true in prod (HTTPS); false for local dev
      providerParams: { response_type: 'code' },
      scope: ['openid', 'profile', 'email', 'offline_access'] // + any Graph scopes you need
    })

    // --- Cookie: session strategy ---
    server.auth.strategy('session', 'cookie', {
      cookie: {
        name: 'sid',
        password: options.cookiePassword, // strong 32+ chars
        isSecure: options.isSecure,
        path: '/',
        ttl: 24 * 60 * 60 * 1000 // 1 day
      },
      redirectTo: '/auth/login',
      // Optional per-request validation
      validate: async (request, session) => {
        // e.g. ensure session shape or check revocation
        return { isValid: true, credentials: session }
      }
    })

    // (Optional) make all routes require a session by default
    // server.auth.default('session');

    // --- Login route: initiates & handles the Azure AD flow via Bell ---
    server.route({
      method: ['GET', 'POST'],
      path: '/auth/login',
      options: {
        auth: { strategy: 'azureAD', mode: 'try' } // Bell runs; handler fires on callback
      },
      handler: async (request, h) => {
        if (!request.auth.isAuthenticated) {
          request.log(['auth', 'error'], request.auth.error)
          return h.response('Authentication failed').code(401)
        }

        // Bell gives us third-party credentials/profile
        const creds = request.auth.credentials
        const profile = creds.profile // fields depend on scopes
        // Create your session from the profile/tokens
        request.cookieAuth.set({
          sub: profile.id,
          name: profile.displayName,
          email: profile.email,
          accessToken: creds.token,
          refreshToken: creds.refreshToken
          // Compute expiry in your preferred way
        })

        return h.redirect('/dashboard')
      }
    })

    // --- Logout ---
    server.route({
      method: 'GET',
      path: '/auth/logout',
      options: { auth: 'session' }, // or auth: false if you prefer
      handler: (request, h) => {
        request.cookieAuth.clear()
        return h.redirect('/')
      }
    })
  }
}
```

> **Notes**
>
> - Bell provides many providers including **AzureAD** out of the box [2][3].
> - Some Bell versions require `config: { tenant: '...' }` rather than `tenantId`. Passing it via `config` avoids Joi validation errors like _“tenantId is not allowed”_ [9].
> - See Bell’s **examples** for full flows (Okta, Google, etc.) which mirror the Azure pattern [4].
> - Cookie auth is for **session management** and expects you to authenticate the user by other means first (here, Bell) [5].

### 5.2 Dashboard plugin (protected route)

```js
// src/plugins/dashboard/index.js
exports.plugin = {
  name: 'dashboard',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/dashboard',
      options: {
        auth: 'session' // enforce the cookie-based session
      },
      handler: (request, h) => {
        const { credentials } = request.auth
        return h.view('dashboard', { user: credentials })
      }
    })
  }
}
```

### 5.3 Bootstrapping (register your plugins)

```js
// server.js (simplified)
const Hapi = require('@hapi/hapi')

async function start() {
  const server = Hapi.server({ port: 3000, host: 'localhost' })

  // Register your feature plugins
  await server.register({
    plugin: require('./src/plugins/auth'),
    options: {
      azureTenant: process.env.AAD_TENANT_ID,
      azureClientId: process.env.AAD_CLIENT_ID,
      azureClientSecret: process.env.AAD_CLIENT_SECRET,
      tempCookiePassword: process.env.TEMP_COOKIE_PASSWORD,
      cookiePassword: process.env.COOKIE_PASSWORD,
      isSecure: process.env.NODE_ENV === 'production'
    }
  })
  await server.register(require('./src/plugins/dashboard'))

  await server.start()
  console.log(`Server running at: ${server.info.uri}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

---

## 6) Request lifecycle (auth evaluation)

1. **Incoming request → route matched**.
2. If the route has `options.auth` (or a **default** auth was set), hapi invokes that **strategy’s scheme**.
3. For `auth: 'session'`, the **cookie scheme** decrypts & validates the session. If invalid, hapi auto‑redirects to `/auth/login` (because we set `redirectTo`) [5].
4. For `/auth/login`, the **Bell scheme** runs the OIDC flow: first request **redirects to Azure AD**; the callback **POSTs back** to `/auth/login`; afterward `request.auth.isAuthenticated` is `true` and credentials are available. You **set the session** with `cookieAuth.set()` and redirect to your target (e.g., `/dashboard`) [2][4][5].

This fully separates concerns: **Bell for initial identity**, **Cookie for session**, **routes declare auth** simply with `auth: 'session'` [1][5].

---

## 7) Tips, pitfalls, and “expert” touches

- **Make `server.auth.default('session')` your friend**: protect everything by default; mark only public endpoints as `auth: false` or give them different strategies [1].
- **Scope minimal data into the cookie**: store only what you need (subject ID, display name, email, tokens). Consider rotating refresh tokens and token expiry tracking server‑side if you need stronger control.
- **Use plugin options** for secrets/config so your plugin is reusable and testable; read from env in the bootstrap, not inside the plugin [6][7].
- **AzureAD nuances**: older Bell versions differ between `'azure'` and `'azuread'` provider keys; and **`tenant`** is preferred over `tenantId` in newer versions [9]. Check **Bell providers** and **examples** for current shape [3][4].
- **Testing**: mock `@hapi/bell` redirects/callbacks and cookie behaviors via hapi’s `server.inject()`; keep your token refresh flow (if any) isolated and unit‑tested.
- **Plugin boundaries**: keep all routes related to a feature inside that plugin (e.g., `/auth/login`, `/auth/logout` inside **auth plugin**; `/dashboard` inside **dashboard plugin**) [6][7].

---

## 8) Adapting to the DEFRA CDP template

Start from the **CDP Node Frontend Template** [10]. Add your two plugins under `src/plugins/` and register them in the template’s server bootstrap. If the template offers a central plugin registration point or manifest, include your plugin entries there. Keep your **Azure AD secrets** in the template’s configuration/secret management approach.

---

## References & Glossary

1. **hapi Auth Tutorial** — schemes, strategies, `server.auth.strategy`, defaults. https://hapi.dev/tutorials/auth/ \[Accessed 2025‑11‑03\]
2. **`@hapi/bell` (module)** — overview & supported providers. https://hapi.dev/module/bell/ \[Accessed 2025‑11‑03\]
3. **Bell Providers** — provider‑specific options (AzureAD). https://hapi.dev/module/bell/providers/ \[Accessed 2025‑11‑03\]
4. **Bell Examples** — end‑to‑end patterns (e.g., Okta/Google) applicable to Azure. https://hapi.dev/module/bell/examples/ \[Accessed 2025‑11‑03\]
5. **`@hapi/cookie` API** — cookie session semantics, redirect, validate. https://hapi.dev/module/cookie/api/ \[Accessed 2025‑11‑03\]
6. **Server/Plugin Separation (hapipal best practices)** — what belongs in a plugin. https://hapipal.com/best-practices/server-plugin-separation \[Accessed 2025‑11‑03\]
7. **Manifests, plugins & schemas (Medium)** — organizing hapi apps by feature/plugins. https://medium.com/@dstevensio/manifests-plugins-and-schemas-organizing-your-hapi-application-68cf316730ef \[Accessed 2025‑11‑03\]
8. **Scheme vs Strategy (StackOverflow)** — conceptual explanation. https://stackoverflow.com/questions/32583802/in-hapi-js-what-is-the-difference-between-an-auth-scheme-and-strategy \[Accessed 2025‑11‑03\]
9. **AzureAD tenant option in Bell (StackOverflow)** — `tenant` vs `tenantId` & Joi validation. https://stackoverflow.com/questions/58066759/validationerror-tenantid-is-not-allowed-when-using-azuread-for-hapi-js-route \[Accessed 2025‑11‑03\]
10. **DEFRA CDP Node Frontend Template (GitHub)** — base project to extend. https://github.com/DEFRA/cdp-node-frontend-template \[Accessed 2025‑11‑03\]
