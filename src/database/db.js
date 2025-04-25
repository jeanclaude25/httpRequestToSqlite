import sqlite3 from 'sqlite3';
import { config } from '../utils/config.js';

// Rendre sqlite3 plus verbeux
const { Database } = sqlite3.verbose();

/**
 * Initialise et retourne une connexion à la base de données
 * @returns {Promise<Database>} - Connexion à la base de données
 */
export function initDatabase() {
    return new Promise((resolve, reject) => {
        try {
            const db = new Database(config.dbPath);
            resolve(db);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Ferme la connexion à la base de données
 * @param {Database} db - Instance de la base de données
 * @returns {Promise<void>}
 */
export function closeDatabase(db) {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Exécute une requête SQL sur la base de données
 * @param {Database} db - Instance de la base de données
 * @param {string} query - Requête SQL à exécuter
 * @param {Array} params - Paramètres de la requête
 * @returns {Promise<any>} - Résultat de la requête
 */
export function executeQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}
