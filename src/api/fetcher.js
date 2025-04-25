import fetch from 'node-fetch';
import { AbortController } from 'abort-controller';

/**
 * Effectue une requête HTTP GET vers une URL spécifiée
 * @param {string} url - URL à appeler
 * @returns {Promise<Object>} - Données JSON récupérées
 */
export async function fetchData(url) {
    const abortController = new AbortController();

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            signal: abortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request was aborted');
        }
        throw error;
    }
}

/**
 * Télécharge une image depuis une URL et la sauvegarde dans un fichier
 * @param {string} url - URL complète de l'image
 * @param {string} filePath - Chemin de sauvegarde sur le disque
 * @returns {Promise<void>}
 */
export async function downloadImage(url, filePath) {
    const fs = await import('fs');
    const { pipeline } = await import('stream/promises');
    const path = await import('path');
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Créer le répertoire parent s'il n'existe pas
        const dirname = path.dirname(filePath);
        fs.mkdirSync(dirname, { recursive: true });
        
        // Créer un flux d'écriture
        const fileStream = fs.createWriteStream(filePath);
        
        // Télécharger l'image avec pipeline
        await pipeline(response.body, fileStream);
        
        return filePath;
    } catch (error) {
        console.error(`Erreur lors du téléchargement de l'image: ${error.message}`);
        throw error;
    }
}
