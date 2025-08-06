import fastify from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import { checkDatabaseConnection, initializeSequelize } from "./config/instance";
import formBodyPlugin from "@fastify/formbody";
import keycloak, { KeycloakOptions } from 'fastify-keycloak-adapter';
import { databaseConfig } from './config/db';
import { handleRouteSecurity } from "./utility/securityUtils";
import LoadSwagger from "./config/swagger";
import multipart from '@fastify/multipart';

dotenv.config();

const app = fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty"
    }
  }
});

app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

app.register(formBodyPlugin);
app.register(multipart, {
  limits: {
    fieldNameSize: 100,
    fieldSize: 100,
    fields: 10,
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
    headerPairs: 2000,
  },
  // Disable temp files to avoid disk space issues in serverless
  throwFileSizeLimit: true,
  attachFieldsToBody: false,
});

const start = async () => {
  try {
    await initializeSequelize();
    const dbStatus = await checkDatabaseConnection();
    console.log('DB status:', dbStatus);

    if (!dbStatus.connected) {
      throw new Error(dbStatus.message);
    }

    const config = databaseConfig.config;
    const opts: KeycloakOptions = {
      appOrigin: config.app_origin,
      keycloakSubdomain: config.keycloak_subdomain,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      bypassFn: (req: any) => handleRouteSecurity(req),
      unauthorizedHandler: (request: any, reply: any) => {
        const authHeader = request.headers?.authorization;
        if (!(authHeader?.startsWith("Bearer "))) {
          reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Token not found",
          });
        } else {
          reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Access denied. You are not authorized to perform this action.",
          });
        }
      },
    };
    try {
      app.register(keycloak, opts);
      console.log("Keycloak plugin registered successfully");
    } catch (error) {
      console.error("Failed to register Keycloak plugin:", error);
    }
    await LoadSwagger(app);

    app.get("/config/health-check", async (request, reply) => {
      try {
        await initializeSequelize();
        const connectionStatus = await checkDatabaseConnection();
        return reply.status(connectionStatus.connected ? 200 : 503).send({
          "message": "Health Check Page",
          "name": "Config API",
          "version": '1.0.0',
          "status": 200,
          "dependencies": [
            {
              "type": "database-mysql",
              "status": connectionStatus.connected,
              "required": true
            },

          ],
          timestamp: new Date().toUTCString()
        });
      } catch (error) {
        return reply.status(500).send({
          status: "error",
          message: "Failed to check database connection",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    const registerRoutes = require("./routes").default;
    app.register(registerRoutes);

    const port = 8000;
    app.listen({ port, host: "0.0.0.0" }, (err) => {
      if (err) throw err;
      app.log.info(`🚀 Server is running on http://localhost:${port}`);
    });

    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
