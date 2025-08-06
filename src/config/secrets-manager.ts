import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import * as dotenv from "dotenv";

dotenv.config();

const secretName = process.env.SECRET_NAME;
const region = process.env.REGION;

const secretsManager = new SecretsManagerClient({ region });

export const getSecretsManager = async () => {
    if (process.env.NODE_ENV === 'local') {
        return {
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT,
            user: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
            redis_port: process.env.REDIS_PORT,
            redis_host: process.env.REDIS_HOST,
            redis_replica_host: process.env.REDIS_REPLICA_HOST,
            notification_url: process.env.NOTIFICATION_URL,
            database_auth: process.env.DATABASE_AUTH,
            sourcing_url: process.env.SOURCING_URL,
            auth_url: process.env.AUTH_URL,
            teai_url: process.env.TEAI_URL,
            sow_url: process.env.SOW_URL,
            db_sourcing: process.env.DB_SOURCING,
            ui_base_url: process.env.UI_BASE_URL,
            keycloak_subdomain: process.env.KC_AUTH_URL,
            keycloak_client_id: process.env.KC_CLIENT_ID,
            keycloak_client_secret: process.env.KC_CLIENT_SECRET,
            keycloak_realm: process.env.KC_REALM,
            app_origin: process.env.KC_URL,
            ai_url: process.env.AI_URL,
        };
    }

    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const data = await secretsManager.send(command);

        if (data.SecretString) {
            const secret = JSON.parse(data.SecretString);
            console.log('secret:', secret);
            return {
                host: secret.DATABASE_HOST,
                port: secret.DATABASE_PORT,
                user: secret.DATABASE_USER,
                password: secret.DATABASE_PASSWORD,
                database: secret.DATABASE_NAME,
                redis_host: secret.REDIS_HOST,
                redis_port: secret.REDIS_PORT,
                redis_auth: secret.REDIS_AUTH,
                redis_replica_host: secret.REDIS_REPLICA_HOST,
                notification_url: secret.NOTIFICATION_URL,
                database_auth: secret.DATABASE_AUTH,
                sourcing_url: secret.SOURCING_URL,
                auth_url: secret.AUTH_URL,
                teai_url: secret.TEAI_URL,
                sow_url: secret.SOW_URL,
                ui_base_url: secret.UI_BASE_URL,
                db_sourcing: secret.DATABASE_SOURCING,
                keycloak_subdomain: secret.KC_AUTH_URL,
                app_origin: secret.KC_URL,
                keycloak_client_id: secret.KC_CLIENT_ID,
                keycloak_client_secret: secret.KC_CLIENT_SECRET,
                keycloak_realm: secret.KC_REALM,
                ai_url:secret.AI_URL
            };
        } else {
            throw new Error("Secret is in an invalid format (no SecretString found)");
        }
    } catch (err: any) {
        console.error("Failed to retrieve database configuration from Secrets Manager:", err.message || err);
        throw err;
    }
};