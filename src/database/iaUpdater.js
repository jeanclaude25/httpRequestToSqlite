import path from 'path';
import { executeQuery } from './db.js';
import { analyzeImage } from '../api/iaService.js';
import { fileExists, imageExists } from '../utils/fileChecker.js';
import { config } from '../utils/config.js';

/**
 * Met à jour les champs IA_EN, IA_FR, IA_DE pour un article
 * @param {Database} db - Instance de la base de données
 * @param {number} articleId - ID de l'article à mettre à jour
 * @param {Object} descriptions - Descriptions générées par l'IA
 * @returns {Promise<boolean>} - True si la mise à jour a réussi
 */
async function updateArticleDescriptions(db, articleId, descriptions) {
    try {
        const query = `
            UPDATE items 
            SET IA_EN = ?, IA_FR = ?, IA_DE = ?
            WHERE id = ?
        `;
        
        await executeQuery(db, query, [
            descriptions.en,
            descriptions.fr,
            descriptions.de,
            articleId
        ]);
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour des descriptions pour l'article ${articleId}: ${error.message}`);
        return false;
    }
}

/**
 * Vérifie si un article a déjà des descriptions IA remplies
 * @param {Database} db - Instance de la base de données
 * @param {number} articleId - ID de l'article à vérifier
 * @returns {Promise<boolean>} - True si l'article a déjà des descriptions
 */
async function hasDescriptions(db, articleId) {
    try {
        const query = "SELECT IA_EN, IA_FR, IA_DE FROM items WHERE id = ?";
        const results = await executeQuery(db, query, [articleId]);
        
        if (results && results.length > 0) {
            const article = results[0];
            // Vérifier si au moins un des champs est rempli
            return Boolean(article.IA_EN || article.IA_FR || article.IA_DE);
        }
        
        return false;
    } catch (error) {
        console.error(`Erreur lors de la vérification des descriptions pour l'article ${articleId}: ${error.message}`);
        return false;
    }
}

/**
 * Récupère les informations de l'article
 * @param {Database} db - Instance de la base de données
 * @param {number} articleId - ID de l'article
 * @returns {Promise<Object>} - Informations de l'article
 */
async function getArticleInfo(db, articleId) {
    try {
        const query = "SELECT id, description FROM items WHERE id = ?";
        const results = await executeQuery(db, query, [articleId]);
        
        if (results && results.length > 0) {
            return results[0];
        }
        
        return null;
    } catch (error) {
        console.error(`Erreur lors de la récupération des informations pour l'article ${articleId}: ${error.message}`);
        return null;
    }
}

/**
 * Analyse les images de tous les articles et met à jour les champs IA
 * @param {Database} db - Instance de la base de données
 * @returns {Promise<void>}
 */
export async function processArticlesWithAI(db) {
    try {
        
        // Récupérer tous les articles avec leurs URLs d'image
        const articles = await executeQuery(db, 'SELECT id, imageUrlSmall FROM items');
        console.log(`${articles.length} articles trouvés pour analyse IA`);
        
        // Statistiques
        let processedCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Parcourir chaque article
        for (const article of articles) {
            try {
                // Vérifier si l'article a déjà des descriptions et si on ne force pas l'analyse
                const hasExistingDescriptions = await hasDescriptions(db, article.id);
                
                if (hasExistingDescriptions && !config.forceIADescriptionAnalysis) {
                    console.log(`Article ${article.id}: Descriptions IA déjà existantes, ignoré`);
                    skipCount++;
                    continue;
                } else if (hasExistingDescriptions && config.forceIADescriptionAnalysis) {
                    console.log(`Article ${article.id}: Descriptions IA existantes, mais analyse forcée (FORCE_IA_DESCRIPTION_ANALYSIS=true)`);
                }
                
                // Vérifier si l'article a une URL d'image
                if (!article.imageUrlSmall) {
                    console.log(`Article ${article.id}: Pas d'URL d'image, ignoré`);
                    skipCount++;
                    continue;
                }
                
                // Récupérer les informations de l'article
                const articleInfo = await getArticleInfo(db, article.id);
                if (!articleInfo) {
                    console.error(`Article ${article.id}: Impossible de récupérer les informations de l'article`);
                    errorCount++;
                    continue;
                }
                
                // Construire le chemin local de l'image
                const fileName = path.basename(article.imageUrlSmall);
                const imagePath = path.join('downloaded_images', 'Small', fileName);
                
                // Vérifier si l'image existe localement
                if (!fileExists(imagePath)) {
                    console.log(`Article ${article.id}: Image non trouvée localement: ${imagePath}`);
                    errorCount++;
                    continue;
                }
                
                console.log(`Article ${article.id}: Analyse de l'image: ${fileName}`);
                
                // Analyser l'image avec l'IA en incluant les informations de l'article
                const descriptions = await analyzeImage(imagePath, articleInfo);
                
                // Mettre à jour la base de données
                const updateSuccess = await updateArticleDescriptions(db, article.id, descriptions);
                
                if (updateSuccess) {
                    // Vérifier si c'est une détection de LIQUIDATION
                    if (descriptions.en === 'LIQUIDATION' && 
                        descriptions.fr === 'LIQUIDATION' && 
                        descriptions.de === 'LIQUIDATION') {
                        console.log(`Article ${article.id}: LIQUIDATION DÉTECTÉE ✓`);
                    } else {
                        console.log(`Article ${article.id}: Descriptions mises à jour avec succès:`);
                        console.log(`  EN: ${descriptions.en.substring(0, 50)}...`);
                        console.log(`  FR: ${descriptions.fr.substring(0, 50)}...`);
                        console.log(`  DE: ${descriptions.de.substring(0, 50)}...`);
                    }
                    processedCount++;
                } else {
                    console.error(`Article ${article.id}: Échec de la mise à jour des descriptions`);
                    errorCount++;
                }
                
            } catch (error) {
                console.error(`Erreur lors du traitement de l'article ${article.id}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log(`Analyse IA terminée. Traités: ${processedCount}, Ignorés: ${skipCount}, Erreurs: ${errorCount}`);
        
    } catch (error) {
        console.error(`Erreur globale lors du traitement IA: ${error.message}`);
        throw error;
    }
}

