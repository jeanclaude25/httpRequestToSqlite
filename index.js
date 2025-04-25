import { config } from './src/utils/config.js';
import { fetchData } from './src/api/fetcher.js';
import { initDatabase, closeDatabase } from './src/database/db.js';
import { createTableStructure, insertData } from './src/database/schema.js';
import { downloadAllImages } from './src/utils/imageManager.js';
import { processArticlesWithAI } from './src/database/iaUpdater.js';
import { fileExists } from './src/utils/fileChecker.js';

/**
 * Fonction principale du programme
 */
async function main() {
    let db = null;
    
    try {
        console.log('=== DÉMARRAGE DU PROGRAMME ===');
        console.log('Configuration actuelle:');
        console.log('- SKIP_DATABASE_CREATION:', config.skipDatabaseCreation);
        console.log('- SKIP_IMAGE_DOWNLOAD:', config.skipImageDownload);
        console.log('- SKIP_IA_DESCRIPTION_ANALYSIS:', config.skipIADescriptionAnalysis);
        console.log('- FORCE_DATABASE_CREATION:', config.forceDatabaseCreation);
        console.log('- FORCE_IMAGE_DOWNLOAD:', config.forceImageDownload);
        console.log('- FORCE_IA_DESCRIPTION_ANALYSIS:', config.forceIADescriptionAnalysis);
        
        // Vérifier si la base de données existe déjà
        const dbExists = fileExists(config.dbPath);
        
        // Initialiser la connexion à la base de données
        db = await initDatabase();
        
        // ÉTAPE 1: Création de la base de données si nécessaire
        const shouldCreateDatabase = (!dbExists && !config.skipDatabaseCreation) || config.forceDatabaseCreation;
        
        if (shouldCreateDatabase) {
            console.log('\n=== ÉTAPE 1: CRÉATION DE LA BASE DE DONNÉES ===');
            if (config.forceDatabaseCreation) {
                console.log('Option FORCE_DATABASE_CREATION activée. Création forcée de la base de données.');
            } else {
                console.log('Base de données non trouvée. Initialisation du processus de création...');
            }
            console.log(`Connexion au serveur: ${config.server}`);
            
            // Récupérer les données de l'API
            console.log('Récupération des articles...');
            const data = await fetchData(config.server);
            console.log(`${data.length} articles récupérés`);
            
            // Créer la structure de la table
            console.log('Création de la structure de la table...');
            const columns = await createTableStructure(db, data);
            
            // Insérer les données dans la base
            console.log('Insertion des articles dans la base de données...');
            await insertData(db, data, columns);
            
            console.log('Base de données créée et remplie avec succès!');
        } else {
            console.log('\n=== ÉTAPE 1: VÉRIFICATION DE LA BASE DE DONNÉES ===');
            if (config.skipDatabaseCreation) {
                console.log('Option SKIP_DATABASE_CREATION activée. Étape de création ignorée.');
            } else {
                console.log('Base de données existante détectée. Étape de création ignorée.');
            }
        }
        
        // ÉTAPE 2: Téléchargement des images
        const shouldDownloadImages = !config.skipImageDownload || config.forceImageDownload;
        
        console.log('\n=== ÉTAPE 2: TÉLÉCHARGEMENT DES IMAGES ===');
        if (shouldDownloadImages) {
            if (config.forceImageDownload) {
                console.log('Option FORCE_IMAGE_DOWNLOAD activée. Téléchargement forcé des images.');
            }
            await downloadAllImages(db);
        } else {
            console.log('Option SKIP_IMAGE_DOWNLOAD activée. Étape de téléchargement des images ignorée.');
        }
        
        // ÉTAPE 3: Analyse IA des descriptions
        const shouldAnalyzeDescriptions = !config.skipIADescriptionAnalysis || config.forceIADescriptionAnalysis;
        
        console.log('\n=== ÉTAPE 3: ANALYSE DES IMAGES PAR IA ===');
        if (shouldAnalyzeDescriptions) {
            if (config.forceIADescriptionAnalysis) {
                console.log('Option FORCE_IA_DESCRIPTION_ANALYSIS activée. Analyse forcée des descriptions.');
            }
            await processArticlesWithAI(db);
        } else {
            console.log('Option SKIP_IA_DESCRIPTION_ANALYSIS activée. Étape d\'analyse des descriptions ignorée.');
        }
        
        console.log('\n=== PROGRAMME TERMINÉ AVEC SUCCÈS ===');
        
    } catch (error) {
        console.error('\n=== ERREUR ===');
        console.error('Une erreur est survenue:', error);
    } finally {
        // Fermer la connexion à la base de données
        if (db) {
            try {
                await closeDatabase(db);
                console.log('\nConnexion à la base de données fermée');
            } catch (dbError) {
                console.error('\nErreur lors de la fermeture de la base de données:', dbError);
            }
        }
    }
}

// Exécuter le programme
main();
