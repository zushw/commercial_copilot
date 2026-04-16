import { createClient, RedisClientType } from "redis";
import { CachePort } from "../../../core/application/ports/out/CachePort";

export class RedisAdapter implements CachePort {
    private client: RedisClientType;
    private isConnected = false;

    private memoryFallback = new Map<string, { value: string; expiry: number }>();

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        this.client = createClient({
        url: redisUrl,
        socket: {
            reconnectStrategy: (attempts) => {
                if (attempts > 5) {
                    console.warn("Redis reconnect attempts exceeded.");
                    return new Error("Max retries reached");
                }
                return Math.min(attempts * 200, 2000); 
            }
        }
        });

        this.client.on('error', (err) => {
            if (!this.isConnected) return; 
            console.error('[Redis Error]', err);
        });

        this.client.on("end", () => {
            console.warn("[Redis] disconnected, using memory fallback");
            this.isConnected = false;
        });
    }

    public async connect(): Promise<void> {
        try {
            await this.client.connect();
            this.isConnected = true;
            console.log('Redis client connected successfully.');
        } catch (error: any) {
            console.warn(`Redis connection failed: ${error.message}.`);
            console.warn('System is falling back to IN-MEMORY cache.');
            this.isConnected = false;
        }
    }

    async get(key: string): Promise<string | null> {
        if (this.isConnected) {
            try {
                return await this.client.get(key);
            } catch (error) {
                console.error(`[RedisAdapter] GET Error for key ${key}:`, error);
                return null;
            }
        } else {
            const record = this.memoryFallback.get(key);
            if (!record) return null;
            if (Date.now() > record.expiry) {
                this.memoryFallback.delete(key);
                return null;
            }
            return record.value;
        }
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        if (this.isConnected) {
            try {
                await this.client.setEx(key, ttlSeconds, value);
            } catch (error) {
                console.error(`[RedisAdapter] SET Error for key ${key}:`, error);
            }
        } else {
            const expiry = Date.now() + (ttlSeconds * 1000);
            this.memoryFallback.set(key, { value, expiry });
        }
    }
}