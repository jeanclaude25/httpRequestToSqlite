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
        
        // Vérifier si la base de données existe déjà
        const dbExists = fileExists(config.dbPath);
        
        // Initialiser la connexion à la base de données
        db = await initDatabase();
        
        // ÉTAPE 1: Si la base de données n'existe pas, créer et remplir la base
        if (!dbExists) {
            console.log('\n=== ÉTAPE 1: CRÉATION DE LA BASE DE DONNÉES ===');
            console.log('Base de données non trouvée. Initialisation du processus de création...');
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
            console.log('Base de données existante détectée. Étape de création ignorée.');
        }
        
        // ÉTAPE 2: Télécharger les images des articles
        console.log('\n=== ÉTAPE 2: TÉLÉCHARGEMENT DES IMAGES ===');
        await downloadAllImages(db);
        
        // ÉTAPE 3: Analyser les images avec l'IA et mettre à jour la base de données
        console.log('\n=== ÉTAPE 3: ANALYSE DES IMAGES PAR IA ===');
        await processArticlesWithAI(db);
        
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
