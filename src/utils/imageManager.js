import path from 'path';
import { config } from './config.js';
import { downloadImage } from '../api/fetcher.js';
import { executeQuery } from '../database/db.js';
import { imageExists } from './fileChecker.js';

/**
 * Télécharge les images de tous les articles de la base de données
 * @param {Database} db - Instance de la base de données
 * @returns {Promise<void>}
 */
export async function downloadAllImages(db) {
    try {
        // Récupérer tous les articles avec leur URL d'image
        const articles = await executeQuery(db, 'SELECT id, imageUrlSmall FROM items');
        console.log(`${articles.length} articles trouvés pour téléchargement d'images`);
        
        // Parcourir chaque article et télécharger son image
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;
        
        for (const article of articles) {
            try {
                if (!article.imageUrlSmall) {
                    console.log(`Article ${article.id}: Pas d'URL d'image trouvée`);
                    continue;
                }
                
                // Obtenir le nom du fichier depuis l'URL
                const fileName = path.basename(article.imageUrlSmall);
                
                // Définir le chemin local pour sauvegarder l'image
                const savePath = path.join('downloaded_images', 'Small', fileName);
                
                // Vérifier si l'image existe déjà
                if (imageExists(article.imageUrlSmall)) {
                    console.log(`Article ${article.id}: Image déjà téléchargée: ${fileName}`);
                    skipCount++;
                    continue;
                }
                
                // Construire l'URL complète de l'image
                const imageUrl = `${config.imageApiPath}${article.imageUrlSmall}`;
                
                // Télécharger l'image
                await downloadImage(imageUrl, savePath);
                console.log(`Article ${article.id}: Image téléchargée avec succès: ${fileName}`);
                successCount++;
                
            } catch (error) {
                console.error(`Article ${article.id}: Erreur lors du téléchargement de l'image: ${error.message}`);
                failCount++;
            }
        }
        
        console.log(`Téléchargement d'images terminé. Succès: ${successCount}, Ignorées: ${skipCount}, Échecs: ${failCount}`);
        
    } catch (error) {
        console.error(`Erreur lors du téléchargement des images: ${error.message}`);
        throw error;
    }
}
