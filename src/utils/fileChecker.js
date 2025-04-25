import fs from 'fs';
import path from 'path';

/**
 * Vérifie si un fichier existe
 * @param {string} filePath - Chemin du fichier à vérifier
 * @returns {boolean} - True si le fichier existe, false sinon
 */
export function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        console.error(`Erreur lors de la vérification du fichier ${filePath}:`, error);
        return false;
    }
}

/**
 * Vérifie si une image existe déjà localement
 * @param {string} imageUrl - URL relative de l'image (comme stockée en BDD)
 * @param {string} basePath - Chemin de base pour les images téléchargées
 * @returns {boolean} - True si l'image existe, false sinon
 */
export function imageExists(imageUrl, basePath = 'downloaded_images') {
    if (!imageUrl) return false;
    
    const fileName = path.basename(imageUrl);
    const category = imageUrl.includes('/Small/') ? 'Small' : 
                    imageUrl.includes('/Medium/') ? 'Medium' : 
                    imageUrl.includes('/Large/') ? 'Large' : '';
    
    const imagePath = path.join(basePath, category, fileName);
    
    return fileExists(imagePath);
}
