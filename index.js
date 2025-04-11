import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import { AbortController } from 'abort-controller';
import dotenv from 'dotenv';

dotenv.config();
const { Database } = sqlite3.verbose();

// Fonction pour faire la requête HTTP avec fetch
async function fetchData(url) {
    const abortController = new AbortController();

    try {
        const response = await fetch(url, {
            method: "GET",
            //credentials: "include",
            headers: {
                //Authorization: `Bearer ${process.env.TOKEN}`,
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

// Fonction pour analyser la structure et créer la table
function createTableStructure(db, data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Données invalides');
    }

    const firstItem = data[0];
    const columns = [];

    for (const [key, value] of Object.entries(firstItem)) {
        let type = 'TEXT';
        
        if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'INTEGER' : 'REAL';
        } else if (typeof value === 'boolean') {
            type = 'INTEGER';
        }
        
        columns.push(`${key} ${type}`);
    }

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ${columns.join(',\n            ')}
        )
    `;

    return new Promise((resolve, reject) => {
        db.run(createTableQuery, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(columns);
            }
        });
    });
}

// Fonction pour insérer les données
function insertData(db, data, columns) {
    const placeholders = columns.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO items (${columns.map(col => col.split(' ')[0]).join(', ')}) VALUES (${placeholders})`;

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const stmt = db.prepare(insertQuery);
            
            data.forEach(item => {
                const values = columns.map(col => {
                    const key = col.split(' ')[0];
                    return item[key];
                });
                stmt.run(values);
            });
            
            stmt.finalize((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

// Fonction principale
async function main() {
    const url = process.env.SERVER; // Remplacez par votre URL réelle
    console.log(url)
    try {
        // Créer la base de données
        const db = new Database('database.db');
        
        // Faire la requête HTTP
        console.log('Récupération des données...');
        const data = await fetchData(url);
        
        // Créer la table
        console.log('Création de la table...');
        const columns = await createTableStructure(db, data);
        
        // Insérer les données
        console.log('Insertion des données...');
        await insertData(db, data, columns);
        
        console.log('Opération terminée avec succès!');
        
        // Fermer la base de données
        db.close((err) => {
            if (err) {
                console.error('Erreur lors de la fermeture de la base de données:', err);
            }
        });
        
    } catch (error) {
        console.error('Une erreur est survenue:', error);
    }
}

// Exécuter le programme
main();