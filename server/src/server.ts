import { buildApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

async function start(): Promise<void> {
  const app = await buildApp()

  try {
    await prisma.$connect()
  } catch (error) {
    app.log.error({ err: error }, 'Could not connect to PostgreSQL')
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down')
    try {
      await app.close()
      process.exit(0)
    } catch (error) {
      app.log.error({ err: error }, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ host: env.HOST, port: env.PORT })
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start HTTP server')
    process.exit(1)
  }
}

void start()
