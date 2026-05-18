/**
 * Sequelize CLI configuration.
 * Reads DATABASE_URL from environment or .env file.
 *
 * Note: sequelize-cli requires CommonJS format for config.
 */

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const baseConfig = {
  url: DATABASE_URL,
  dialect: 'postgres',
  schema: 'fixit',
  searchPath: 'fixit,public',
  dialectOptions: {
    prependSearchPath: true,
  },
  define: {
    schema: 'fixit',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  logging: false,
};

module.exports = {
  development: {
    ...baseConfig,
    logging: console.log,
  },
  test: {
    ...baseConfig,
    logging: false,
  },
  production: {
    ...baseConfig,
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
  },
};
