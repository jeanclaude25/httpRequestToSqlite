import fetch from 'node-fetch';
import fs from 'fs';
import { config } from '../utils/config.js';

/**
 * Encode une image en base64 à partir de son chemin sur le disque
 * @param {string} imagePath - Chemin de l'image
 * @returns {string} - Image encodée en base64
 */
export function encodeImageToBase64(imagePath) {
    try {
        // Lire le fichier comme un buffer
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Convertir le buffer en base64
        const base64Image = imageBuffer.toString('base64');
        
        // Déterminer le type MIME basé sur l'extension
        let mimeType = 'image/jpeg';
        if (imagePath.toLowerCase().endsWith('.png')) {
            mimeType = 'image/png';
        } else if (imagePath.toLowerCase().endsWith('.gif')) {
            mimeType = 'image/gif';
        } else if (imagePath.toLowerCase().endsWith('.webp')) {
            mimeType = 'image/webp';
        }
        
        // Retourner l'URL data complète
        return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
        console.error(`Erreur lors de l'encodage de l'image: ${error.message}`);
        throw error;
    }
}

/**
 * Analyse une image avec le modèle d'IA
 * @param {string} imagePath - Chemin de l'image à analyser
 * @returns {Promise<Object>} - Résultat de l'analyse avec les descriptions en 3 langues
 */
export async function analyzeImage(imagePath) {
    try {
        // Encoder l'image en base64
        const base64Image = encodeImageToBase64(imagePath);
        
        // Préparer un prompt plus précis
        const prompt = 
            "First, check if this is a 'LIQUIDATION' stamp/image. " +
            "If you see a red 'LIQUIDATION' stamp or text, respond ONLY with: " +
            "EN: LIQUIDATION FR: LIQUIDATION DE: LIQUIDATION " +
            "Otherwise, analyze the product image normally. Describe the article, its color, material, brand, and include any visible numbers. " +
            "Provide a concise one-line description in three languages: " +
            "EN: [English description] FR: [French description] DE: [German description]";
        
        // Construire la requête pour l'API
        const requestBody = {
            model: "gemma-3-4b-it", // Ou tout autre modèle disponible sur votre instance LM Studio
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: { url: base64Image }
                        }
                    ]
                }
            ],
            temperature: 0.5, // Température réduite pour une réponse plus déterministe
            max_tokens: -1, // Pas de limite de tokens pour la réponse
            stream: false
        };
        
        // Effectuer la requête à l'API
        console.log(`Envoi de l'image à l'API pour analyse...`);
        const response = await fetch(`${config.lmStudioUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur API: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        // Extraire la réponse générative
        const aiResponse = result.choices[0].message.content;
        
        // Vérifier si la réponse correspond au format LIQUIDATION
        if (aiResponse.includes('EN: LIQUIDATION') && 
            aiResponse.includes('FR: LIQUIDATION') && 
            aiResponse.includes('DE: LIQUIDATION')) {
            return {
                en: 'LIQUIDATION',
                fr: 'LIQUIDATION',
                de: 'LIQUIDATION'
            };
        }
        
        // Sinon, analyser la réponse pour extraire les descriptions normales
        const descriptions = parseAiResponse(aiResponse);
        return descriptions;
    } catch (error) {
        console.error(`Erreur lors de l'analyse de l'image: ${error.message}`);
        throw error;
    }
}

/**
 * Analyse la réponse de l'IA pour extraire les descriptions dans chaque langue
 * @param {string} aiResponse - Réponse brute de l'IA
 * @returns {Object} - Objet contenant les descriptions par langue
 */
function parseAiResponse(aiResponse) {
    const result = {
        en: '',
        fr: '',
        de: ''
    };
    
    try {
        // Rechercher les patterns dans la réponse
        const enMatch = aiResponse.match(/EN:\s*(.*?)(?=FR:|DE:|$)/is);
        const frMatch = aiResponse.match(/FR:\s*(.*?)(?=EN:|DE:|$)/is);
        const deMatch = aiResponse.match(/DE:\s*(.*?)(?=EN:|FR:|$)/is);
        
        // Extraire et nettoyer les descriptions
        if (enMatch && enMatch[1]) result.en = enMatch[1].trim();
        if (frMatch && frMatch[1]) result.fr = frMatch[1].trim();
        if (deMatch && deMatch[1]) result.de = deMatch[1].trim();
        
        // Si on n'a pas trouvé certaines langues, vérifier d'autres formats possibles
        if (!result.en) {
            const englishMatch = aiResponse.match(/English:\s*(.*?)(?=French:|German:|$)/is);
            if (englishMatch && englishMatch[1]) result.en = englishMatch[1].trim();
        }
        
        if (!result.fr) {
            const frenchMatch = aiResponse.match(/French:\s*(.*?)(?=English:|German:|$)/is);
            if (frenchMatch && frenchMatch[1]) result.fr = frenchMatch[1].trim();
        }
        
        if (!result.de) {
            const germanMatch = aiResponse.match(/German:\s*(.*?)(?=English:|French:|$)/is);
            if (germanMatch && germanMatch[1]) result.de = germanMatch[1].trim();
        }
        
    } catch (error) {
        console.error(`Erreur lors de l'analyse de la réponse IA: ${error.message}`);
    }
    
    return result;
}
