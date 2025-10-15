import process from 'node:process'

import { startServer } from './server/common/helpers/start-server.js'
import { createLogger } from './server/common/helpers/logging/logger.js'

const server = await startServer()
const logger = createLogger()

// Graceful shutdown on SIGTERM (ECS sends this when stopping tasks)
const shutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`)

  try {
    await server.stop({ timeout: 10000 }) // 10 second timeout
    logger.info('Server stopped successfully')
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
