import { Sequelize } from 'sequelize';
import { databaseConfig, initializeDatabase } from './db';

let sequelize: Sequelize;

const initializeSequelize = async () => {
  await initializeDatabase();
  sequelize = new Sequelize(
    databaseConfig.config.database,
    databaseConfig.config.user,
    databaseConfig.config.password,
    {
      host: databaseConfig.config.host,
      port: databaseConfig.config.port,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 300,
        min: 0,
        acquire: 150000,
        idle: 40000,
      },
      retry: {
        max: databaseConfig.config.reconnect.max || 3,
        backoffBase: databaseConfig.config.reconnect.delay || 1000,
      }
    },
  );
    await sequelize.sync({ alter: true });
};

interface DatabaseConnectionStatus {
  connected: boolean;
  message: string;
  database: string;
  error?: string;
}

const checkDatabaseConnection = async (): Promise<DatabaseConnectionStatus> => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    return {
      connected: true,
      message: 'Database connected successfully',
      database: databaseConfig.config.database
    };
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return {
      connected: false,
      message: 'Database connection failed',
      database: databaseConfig.config.database,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export { sequelize, checkDatabaseConnection, initializeSequelize };