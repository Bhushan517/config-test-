import Redis, { RedisOptions } from 'ioredis';
import axios from 'axios';
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

class AWSElastiCacheConnectionManager {
  private static instance: AWSElastiCacheConnectionManager;
  private primaryClient: Redis | null = null;
  private replicaClient: Redis | null = null;
  private readonly connectionState = {
    primary: false,
    replica: false
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Setup periodic health checks
    this.startHealthChecks();

    // Handle process termination gracefully
    process.on('SIGTERM', async () => {
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await this.shutdown();
      process.exit(0);
    });
  }

  public static getInstance(): AWSElastiCacheConnectionManager {
    if (!AWSElastiCacheConnectionManager.instance) {
      AWSElastiCacheConnectionManager.instance = new AWSElastiCacheConnectionManager();
    }
    return AWSElastiCacheConnectionManager.instance;
  }

  private getElastiCacheRedisConfig(host: string, clientType: string): RedisOptions {
    return {
      host: host,
      port: redis_port,
      password: redis_auth,
      tls: {},
      connectTimeout: 10000, // Reduced from 20000 for faster failure detection
      commandTimeout: 5000,  // Reduced from 10000
      maxRetriesPerRequest: 3, // Increased from 2
      enableAutoPipelining: true,
      enableReadyCheck: true, // Ensure Redis is actually ready
      retryStrategy: (times) => {
        // Exponential backoff with jitter
        const delay = Math.min(
          Math.pow(1.5, times) * 1000 + Math.random() * 500, // Less aggressive exponential factor
          30000 // Max 30s delay
        );

        console.warn(`${clientType} ElastiCache connection retry`, {
          attempts: times,
          delay: delay
        });

        if (times > 5) { // Increased max attempts
          console.error(`${clientType} ElastiCache connection failed after max attempts`);
          return null; // Stop retrying after 10 attempts
        }

        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          // Force reconnection on READONLY error (common in failover)
          return 2; // Reconnect and resend command
        }
        return 1; // Reconnect but don't resend
      }
    };
  }

  public async initializeConnections(): Promise<void> {
    try {
      // Initialize replica first (for reads)
      if (!this.replicaClient || !this.connectionState.replica) {
        await this.closeReplicaConnection();
        this.replicaClient = this.createRedisClient(redis_replica_host, 'Replica');

        // Set up event handlers for replica
        this.setupEventHandlers(this.replicaClient, 'Replica');

        await this.verifyElastiCacheConnection(this.replicaClient, 'Replica');
        this.connectionState.replica = true;
        console.info('Replica ElastiCache connection established successfully');
      }

      // Then initialize primary (for writes)
      if (!this.primaryClient || !this.connectionState.primary) {
        await this.closePrimaryConnection();
        this.primaryClient = this.createRedisClient(redis_host, 'Primary');

        // Set up event handlers for primary
        this.setupEventHandlers(this.primaryClient, 'Primary');

        await this.verifyElastiCacheConnection(this.primaryClient, 'Primary');
        this.connectionState.primary = true;
        console.info('Primary ElastiCache connection established successfully');
      }
    } catch (error) {
      console.error('ElastiCache connection initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        primaryHost: redis_host,
        replicaHost: redis_replica_host
      });

      // Schedule reconnection attempt
      this.scheduleReconnect();

      throw error;
    }
  }

  private createRedisClient(host: string, clientType: string): Redis {
    const client = new Redis(this.getElastiCacheRedisConfig(host, clientType));
    return client;
  }

  private setupEventHandlers(client: Redis, clientType: string): void {
    // Handle connection errors
    client.on('error', (err) => {
      console.error(`${clientType} ElastiCache connection error`, {
        error: err.message,
        host: client.options.host
      });

      if (clientType === 'Primary') {
        this.connectionState.primary = false;
      } else {
        this.connectionState.replica = false;
      }

      this.scheduleReconnect();
    });

    // Handle successful reconnections
    client.on('reconnecting', () => {
      console.info(`${clientType} ElastiCache reconnecting...`);
    });

    client.on('ready', () => {
      console.info(`${clientType} ElastiCache connection ready`);
      if (clientType === 'Primary') {
        this.connectionState.primary = true;
      } else {
        this.connectionState.replica = true;
      }
    });

    client.on('end', () => {
      console.info(`${clientType} ElastiCache connection ended`);
      if (clientType === 'Primary') {
        this.connectionState.primary = false;
      } else {
        this.connectionState.replica = false;
      }
    });
  }

  private scheduleReconnect(): void {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Schedule reconnection attempt after 5 seconds
    this.reconnectTimer = setTimeout(async () => {
      try {
        console.info('Attempting to reconnect to ElastiCache...');
        await this.initializeConnections();
      } catch (error) {
        console.error('Scheduled reconnection attempt failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Reconnection will be scheduled again due to error handlers
      }
    }, 5000);
  }

  private startHealthChecks(): void {
    // Clear any existing health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, 30000);
  }

  private async performHealthCheck(): Promise<void> {
    // Check replica connection
    if (this.replicaClient) {
      try {
        await this.replicaClient.ping();
        this.connectionState.replica = true;
      } catch (error) {
        console.warn('Replica health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.connectionState.replica = false;
        // Try to reconnect the replica
        this.scheduleReconnect();
      }
    }

    // Check primary connection if needed
    if (this.primaryClient) {
      try {
        await this.primaryClient.ping();
        this.connectionState.primary = true;
      } catch (error) {
        console.warn('Primary health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.connectionState.primary = false;
        // Try to reconnect the primary
        this.scheduleReconnect();
      }
    }
  }

  private async verifyElastiCacheConnection(client: Redis, clientType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.error(`${clientType} ElastiCache connection verification timeout`, {
          host: client.options.host,
          port: client.options.port
        });
        reject(new Error(`${clientType} ElastiCache connection verification timed out`));
      }, 15000); // Reduced from 30000

      client.ping()
        .then(() => {
          clearTimeout(connectionTimeout);
          resolve();
        })
        .catch((err) => {
          clearTimeout(connectionTimeout);
          console.error(`${clientType} ElastiCache ping failed`, {
            error: err.message,
            host: client.options.host,
            port: client.options.port
          });
          reject(err instanceof Error ? err : new Error(err?.toString() ?? `${clientType} ElastiCache ping failed`));
        });
    });
  }

  public async getPolicies(programId: string, token: string): Promise<any> {
    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }

    const redisKey = this.generateRedisKey(programId, token);
    let redisAvailable = true;
    let cachedPolicies = null;

    // Try to get from Redis if the connections appear to be available
    if (this.replicaClient || this.primaryClient) {
      try {
        // First attempt to initialize connections if needed
        if (!this.replicaClient && !this.primaryClient) {
          try {
            await this.initializeConnections();
          } catch (initError) {
            console.warn('Redis initialization failed, will fetch directly from API', {
              error: initError instanceof Error ? initError.message : 'Unknown error'
            });
            redisAvailable = false;
          }
        }

        if (redisAvailable) {
          // Try to get from replica client with fallback to primary
          try {
            if (this.replicaClient && this.connectionState.replica) {
              cachedPolicies = await this.replicaClient.get(redisKey);
            }
          } catch (replicaError) {
            console.warn('Replica read failed, will try primary', {
              error: replicaError instanceof Error ? replicaError.message : 'Unknown error'
            });
            this.connectionState.replica = false;
            this.scheduleReconnect();
          }

          // If replica failed or returned no data, try primary
          if (!cachedPolicies && this.primaryClient && this.connectionState.primary) {
            try {
              cachedPolicies = await this.primaryClient.get(redisKey);
            } catch (primaryReadError) {
              console.warn('Primary read failed, will fetch from API', {
                error: primaryReadError instanceof Error ? primaryReadError.message : 'Unknown error'
              });
              this.connectionState.primary = false;
              redisAvailable = false;
            }
          }
        }
      } catch (redisError) {
        console.warn('All Redis operations failed, will fetch directly from API', {
          error: redisError instanceof Error ? redisError.message : 'Unknown error'
        });
        redisAvailable = false;
        this.scheduleReconnect();
      }

      // If we found data in Redis cache, return it
      if (cachedPolicies) {
        try {
          return JSON.parse(cachedPolicies);
        } catch (parseError) {
          console.error('Failed to parse cached policies, will fetch from API', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error'
          });
          // Continue to API fetch on parse error
        }
      }
    } else {
      console.info('No Redis clients available, will fetch directly from API');
      redisAvailable = false;
      // Schedule connection attempt for future requests
      this.scheduleReconnect();
    }

    // If cache miss or Redis unavailable, fetch from API
    // Use retries for API calls
    let retryCount = 0;
    const maxRetries = 3;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        console.log('Fetching policies from API (cache miss or Redis unavailable)');
        const { data } = await this.fetchPoliciesFromAPI(programId, token);

        // Try to store in Redis if available
        if (redisAvailable) {
          try {
            // Ensure primary connection for writes
            if (!this.primaryClient || !this.connectionState.primary) {
              try {
                await this.createPrimaryClient();
              } catch (createError) {
                console.warn('Failed to create primary client for caching', {
                  error: createError instanceof Error ? createError.message : 'Unknown error'
                });
                // Continue without caching
              }
            }

            if (this.primaryClient && this.connectionState.primary) {
              await this.primaryClient.set(
                redisKey,
                JSON.stringify(data.response),
                'EX',
                3600 // 1 hour expiration
              );
              console.info('Successfully cached policies in Redis');
            }
          } catch (cacheError) {
            // Log but don't fail the request if caching fails
            console.error('Failed to cache policies in Redis', {
              error: cacheError instanceof Error ? cacheError.message : 'Unknown error'
            });
            this.connectionState.primary = false;
            this.scheduleReconnect();
          }
        }

        return data.response;
      } catch (apiError) {
        retryCount++;
        lastError = apiError;

        if (retryCount >= maxRetries) {
          break; // Will throw error after loop
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(Math.pow(2, retryCount) * 500, 5000);
        console.warn(`Retrying API fetch (${retryCount}/${maxRetries})`, {
          delay,
          programId
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    this.logDetailedError(lastError, programId, token);
    throw lastError ?? new Error("Failed to fetch policies from API after retries");
  }

  private async createPrimaryClient(): Promise<Redis> {
    // Close existing primary connection if any
    await this.closePrimaryConnection();

    // Create primary client
    this.primaryClient = this.createRedisClient(redis_host, 'Primary');

    // Set up event handlers
    this.setupEventHandlers(this.primaryClient, 'Primary');

    // Verify primary connection
    await this.verifyElastiCacheConnection(this.primaryClient, 'Primary');
    this.connectionState.primary = true;

    return this.primaryClient;
  }

  private async closeReplicaConnection(): Promise<void> {
    if (this.replicaClient) {
      try {
        await this.replicaClient.quit();
        this.replicaClient = null;
        this.connectionState.replica = false;
      } catch (error) {
        console.error('Error closing replica connection', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Force disconnect if quit fails
        if (this.replicaClient) {
          this.replicaClient.disconnect();
          this.replicaClient = null;
          this.connectionState.replica = false;
        }
      }
    }
  }

  private async closePrimaryConnection(): Promise<void> {
    if (this.primaryClient) {
      try {
        await this.primaryClient.quit();
        this.primaryClient = null;
        this.connectionState.primary = false;
      } catch (error) {
        console.error('Error closing primary connection', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Force disconnect if quit fails
        if (this.primaryClient) {
          this.primaryClient.disconnect();
          this.primaryClient = null;
          this.connectionState.primary = false;
        }
      }
    }
  }

  private logDetailedError(error: any, programId: string, token: string): void {
    console.error('Policy fetching error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      programId,
      tokenHash: this.hashToken(token),
      connectionState: this.connectionState
    });

    if (axios.isAxiosError(error)) {
      console.error('Axios error occurred:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout exceeded');
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }

  private generateRedisKey(programId: string, token: string): string {
    return `policies:${programId}:${this.hashToken(token)}`;
  }

  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private async fetchPoliciesFromAPI(programId: string, token: string) {
    console.log('Fetching policies from API:', `${auth_url}/v1/api/policy/user/tenant/${programId}`);
    return axios.get(
      `${auth_url}/v1/api/policy/user/tenant/${programId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // Reduced from 15000 for faster failure detection
        validateStatus: (status) => status >= 200 && status < 300 // Only consider 2xx as success
      }
    );
  }

  public async shutdown(): Promise<void> {
    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close connections
    await this.closeReplicaConnection();
    await this.closePrimaryConnection();
    console.info('ElastiCache connections closed');
  }
}

// Singleton export
export const elastiCacheConnectionManager = AWSElastiCacheConnectionManager.getInstance();

// Initialization wrapper with retry
export async function initializeElastiCacheConnections(maxRetries = 3): Promise<void> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await elastiCacheConnectionManager.initializeConnections();
      console.info('ElastiCache initialization successful');
      return;
    } catch (error) {
      retryCount++;
      console.error(`ElastiCache initialization failed (attempt ${retryCount}/${maxRetries})`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (retryCount >= maxRetries) {
        console.error('ElastiCache initialization failed after maximum retries');
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
      console.warn(`Retrying initialization in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}