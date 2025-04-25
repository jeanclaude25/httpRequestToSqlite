/**
 * Analyse la structure des données et crée la table si elle n'existe pas
 * @param {Database} db - Instance de la base de données
 * @param {Array} data - Données à analyser
 * @returns {Promise<Array>} - Colonnes créées
 */
export function createTableStructure(db, data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Données invalides');
    }

    const firstItem = data[0];
    const columns = [];

    // Analyser les données pour déterminer les types de colonnes
    for (const [key, value] of Object.entries(firstItem)) {
        let type = 'TEXT';
        
        if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'INTEGER' : 'REAL';
        } else if (typeof value === 'boolean') {
            type = 'INTEGER';
        }
        
        columns.push(`${key} ${type}`);
    }

    // Créer la requête SQL pour la table
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ${columns.join(',\n            ')},
            IA_DE TEXT,
            IA_EN TEXT,
            IA_FR TEXT
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

/**
 * Insère les données dans la table
 * @param {Database} db - Instance de la base de données
 * @param {Array} data - Données à insérer
 * @param {Array} columns - Colonnes de la table
 * @returns {Promise<void>}
 */
export function insertData(db, data, columns) {
    const columnNames = columns.map(col => col.split(' ')[0]);
    const allColumnNames = [...columnNames, 'IA_DE', 'IA_EN', 'IA_FR'];
    const placeholders = allColumnNames.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO items (${allColumnNames.join(', ')}) VALUES (${placeholders})`;

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const stmt = db.prepare(insertQuery);
            
            data.forEach(item => {
                const originalValues = columnNames.map(key => item[key]);
                // Ajouter les valeurs nulles pour les nouveaux champs
                const allValues = [...originalValues, null, null, null];
                stmt.run(allValues);
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
