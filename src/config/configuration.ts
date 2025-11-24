export default () => ({
  // Configuration serveur
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  // Base de données
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT (Authentification)
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Upload de fichiers (Cloudinary)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadFolder:
      process.env.CLOUDINARY_UPLOAD_FOLDER || 'fichier_infos_sante_app_prod',
  },

  // Géocodage (OpenCage)
  geocoding: {
    apiKey: process.env.OPENCAGE_API_KEY,
    apiUrl:
      process.env.GEOCODING_API_URL ||
      'https://api.opencagedata.com/geocode/v1',
  },

  // Emails (Resend)
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    fromName: process.env.FROM_NAME || 'Infos Santé Cameroun',
  },

  // Notifications Push (Firebase)
  firebase: {
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      './firebase-service-account.json',
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '10', 10) || 10,
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
});
