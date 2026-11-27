const Tesseract = require('tesseract.js');

// Formats lisibles par Tesseract (les GIF animés échouent, l'erreur est alors simplement remontée)
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif', 'image/x-portable-bitmap']);
const OCR_TIMEOUT_MS = 60000;

const isSupportedImage = (contentType) => SUPPORTED_TYPES.has(contentType?.split(';')[0].trim().toLowerCase());

const toError = (error) => error instanceof Error ? error : new Error(String(error));

/**
 * Extrait le texte d'une image. Toute panne de Tesseract rejette la promesse.
 *
 * Ne pas remplacer par Tesseract.recognize() : sans errorHandler, une image illisible lève une
 * exception hors de portée du try/catch et fait planter le bot.
 */
const extractText = async (image) => {
    let fail;
    const failure = new Promise((_, reject) => { fail = (error) => reject(toError(error)); });
    // Si le chargement des langues échoue, createWorker ne se résout jamais : d'où le délai maximal
    const timer = setTimeout(() => fail('OCR : délai dépassé'), OCR_TIMEOUT_MS);
    const workerPromise = Tesseract.createWorker('eng+fra', 1, { errorHandler: fail });

    try {
        const recognition = workerPromise
            .then(worker => worker.recognize(image))
            .then(({ data }) => data.text);
        return await Promise.race([recognition, failure]);
    } catch (error) {
        throw toError(error);
    } finally {
        clearTimeout(timer);
        // Sans await : la création du worker peut ne jamais aboutir
        workerPromise.then(worker => worker.terminate()).catch(() => null);
    }
};

module.exports = { extractText, isSupportedImage };
