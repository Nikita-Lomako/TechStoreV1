import { Redis } from 'ioredis'
import { env } from '../config/env.js'

type MemoryEntry = {
  value: string
  expiresAt: number
}

/**
 * Small cache facade over Redis with an in-memory safety net.
 *
 * Redis is always the primary store. The in-memory map keeps local development
 * and unit tests usable when Redis is not running, and also acts as a fallback
 * if Redis goes away after startup. Production deployments should configure
 * REDIS_URL so the TTL cache is shared between instances.
 */
export class CacheStore {
  private client: Redis | null = null
  private redisReady = false
  private loggedFallback = false
  private readonly memory = new Map<string, MemoryEntry>()

  async connect(): Promise<void> {
    if (!env.REDIS_URL) {
      this.logFallback('REDIS_URL is not configured')
      return
    }

    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      retryStrategy: (attempt) => (attempt > 3 ? null : Math.min(attempt * 250, 1_000)),
    })

    client.on('error', (error) => {
      this.redisReady = false
      if (!this.loggedFallback) {
        this.loggedFallback = true
        console.warn('[cache] Redis unavailable, using in-memory fallback:', error.message)
      }
    })
    client.on('ready', () => {
      this.redisReady = true
      this.loggedFallback = false
      console.info('[cache] Redis connection established')
    })
    client.on('close', () => {
      this.redisReady = false
    })

    this.client = client

    try {
      await client.connect()
      await client.ping()
      this.redisReady = true
    } catch (error) {
      this.redisReady = false
      this.logFallback(error instanceof Error ? error.message : String(error))
    }
  }

  get backend(): 'redis' | 'memory' {
    return this.redisReady ? 'redis' : 'memory'
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisReady && this.client) {
      try {
        const raw = await this.client.get(key)
        if (raw !== null) return JSON.parse(raw) as T
      } catch (error) {
        this.markRedisFailure(error)
      }
    }

    const entry = this.memory.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key)
      return null
    }
    return JSON.parse(entry.value) as T
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value)
    const ttl = Math.max(1, Math.floor(ttlSeconds))

    if (this.redisReady && this.client) {
      try {
        await this.client.set(key, serialized, 'EX', ttl)
      } catch (error) {
        this.markRedisFailure(error)
      }
    }

    this.memory.set(key, { value: serialized, expiresAt: Date.now() + ttl * 1_000 })
    this.pruneMemory()
  }

  async delete(key: string): Promise<void> {
    if (this.redisReady && this.client) {
      try {
        await this.client.del(key)
      } catch (error) {
        this.markRedisFailure(error)
      }
    }
    this.memory.delete(key)
  }

  /**
   * Deletes every key that starts with the prefix. Uses SCAN (never KEYS) so it
   * stays safe on larger Redis instances.
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    let deleted = 0

    for (const key of [...this.memory.keys()]) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key)
        deleted += 1
      }
    }

    if (this.redisReady && this.client) {
      try {
        let cursor = '0'
        do {
          const [nextCursor, keys] = await this.client.scan(
            cursor,
            'MATCH',
            `${prefix}*`,
            'COUNT',
            100,
          )
          cursor = nextCursor
          if (keys.length > 0) {
            deleted += await this.client.del(...keys)
          }
        } while (cursor !== '0')
      } catch (error) {
        this.markRedisFailure(error)
      }
    }

    return deleted
  }

  async ping(): Promise<boolean> {
    if (!this.redisReady || !this.client) return false
    try {
      return (await this.client.ping()) === 'PONG'
    } catch (error) {
      this.markRedisFailure(error)
      return false
    }
  }

  async close(): Promise<void> {
    if (!this.client) return
    try {
      await this.client.quit()
    } catch {
      this.client.disconnect()
    }
    this.client = null
    this.redisReady = false
  }

  private pruneMemory(): void {
    if (this.memory.size < 500) return
    const now = Date.now()
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= now) this.memory.delete(key)
    }
  }

  private markRedisFailure(error: unknown): void {
    this.redisReady = false
    this.logFallback(error instanceof Error ? error.message : String(error))
  }

  private logFallback(reason: string): void {
    if (this.loggedFallback) return
    this.loggedFallback = true
    console.warn('[cache] Redis unavailable, using in-memory fallback:', reason)
  }
}

export const cache = new CacheStore()
