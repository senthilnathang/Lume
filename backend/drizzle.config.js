import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/modules/*/models/schema.js',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'lume',
    user: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
  },
});
