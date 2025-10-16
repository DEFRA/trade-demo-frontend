import inert from '@hapi/inert'

import { start } from './start/index.js'
import { examples } from './examples/index.js'
import { view } from './examples/view/index.js'
import { edit } from './examples/edit/index.js'
import { deleteExample } from './examples/delete/index.js'
import { createName } from './examples/create-name/index.js'
import { createValue } from './examples/create-value/index.js'
import { createCounter } from './examples/create-counter/index.js'
import { createCheck } from './examples/create-check/index.js'
import { createConfirmation } from './examples/create-confirmation/index.js'
import { about } from './about/index.js'
import { health } from './health/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        start,
        examples,
        view,
        edit,
        deleteExample,
        createName,
        createValue,
        createCounter,
        createCheck,
        createConfirmation,
        about
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
