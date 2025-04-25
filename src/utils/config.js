import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

export const config = {
    server: process.env.SERVER,
    token: process.env.TOKEN,
    imageApiPath: process.env.IMAGE_API_PATH,
    lmStudioUrl: process.env.BACKEND_LMSTUDIO_URL,
    dbPath: 'database.db'
};
