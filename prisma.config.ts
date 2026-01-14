import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    // Prisma 7 lira DATABASE_URL depuis ton fichier .env automatiquement
    url: process.env.DATABASE_URL,
  },
});
