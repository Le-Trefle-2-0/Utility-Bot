/**
 * Client du modèle de décision (vllm-sr, endpoint System One), partagé par les fonctionnalités
 * qui lui posent des questions : participation de l'IA dans les salons, recommandation d'équipe
 * à l'ouverture d'un ticket.
 *
 * Réglages (settings.json, à la racine ou sous aiChat) :
 *   decision.url, decision.apiKey, decision.model, decision.timeoutSeconds
 */

const DEFAULTS = {
    url: 'https://decision.vllm-sr.ai/v1/systemone',
    model: 'vllm-sr/d3-ultra',
    timeoutSeconds: 8
};

const getDecisionSettings = (Client) => {
    const decision = Client.settings.aiChat?.decision || Client.settings.decision || {};

    return {
        url: decision.url || DEFAULTS.url,
        apiKey: decision.apiKey || null,
        model: decision.model || DEFAULTS.model,
        timeoutMs: (decision.timeoutSeconds ?? DEFAULTS.timeoutSeconds) * 1000,
        // Seuil de probabilité au-delà duquel le bot prend la parole dans un salon
        replyThreshold: decision.replyThreshold
    };
};

/**
 * Pose des questions au modèle de décision.
 * @param {Object} options
 * @param {string} options.state - la situation sur laquelle portent les questions
 * @param {Object} options.questions - questions au format System One (choice, score…)
 * @param {number} [options.timeoutMs] - remplace le délai par défaut
 * @returns {Promise<Object>} les réponses, indexées par nom de question
 * @throws si la clé manque, si le service répond une erreur ou une réponse inattendue
 */
const askDecisionModel = async (Client, { state, questions, timeoutMs }) => {
    const settings = getDecisionSettings(Client);
    if (!settings.apiKey) throw new Error('Decision model API key is not configured');

    const response = await fetch(settings.url, {
        method: 'POST',
        headers: {
            'Authorization': ['Bearer', settings.apiKey].join(' '),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: settings.model, state, questions }),
        signal: AbortSignal.timeout(timeoutMs ?? settings.timeoutMs)
    });

    if (!response.ok) throw new Error(`Decision model HTTP ${response.status}`);

    const answers = (await response.json())?.answers;
    if (!answers || typeof answers !== 'object') throw new Error('Decision model: unexpected response');

    return answers;
};

module.exports = { getDecisionSettings, askDecisionModel };
