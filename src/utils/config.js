import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

export const config = {
    server: process.env.SERVER,
    token: process.env.TOKEN,
    imageApiPath: process.env.IMAGE_API_PATH,
    lmStudioUrl: process.env.BACKEND_LMSTUDIO_URL,
    dbPath: 'database.db',
    // Options pour sauter des étapes
    skipDatabaseCreation: process.env.SKIP_DATABASE_CREATION === 'true',
    skipImageDownload: process.env.SKIP_IMAGE_DOWNLOAD === 'true',
    skipIADescriptionAnalysis: process.env.SKIP_IA_DESCRIPTION_ANALYSIS === 'true',
    
    // Options pour forcer des étapes (prioritaires sur les skip)
    forceDatabaseCreation: process.env.FORCE_DATABASE_CREATION === 'true',
    forceImageDownload: process.env.FORCE_IMAGE_DOWNLOAD === 'true',
    forceIADescriptionAnalysis: process.env.FORCE_IA_DESCRIPTION_ANALYSIS === 'true'
};
