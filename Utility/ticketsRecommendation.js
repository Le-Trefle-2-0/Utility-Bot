/**
 * Recommandation d'équipe à l'ouverture d'un ticket.
 *
 * D'après l'objet de la demande, le modèle de décision indique quelle équipe est la mieux placée.
 * Le membre garde toujours le choix : c'est une suggestion appuyée, jamais une obligation.
 *
 * Réglages (settings.json > tickets) :
 *   teams[].topics   description de ce que traite l'équipe (obligatoire pour participer, au moins
 *                    deux équipes décrites), formulée en groupe nominal : elle est lue par le
 *                    modèle ET affichée au membre après « Elle traite : », ex. « les signalements de
 *                    membres, le harcèlement et les sanctions »
 *   recommendation.enabled         (true)  désactive la recommandation si false
 *   recommendation.minProbability  (0.8)   confiance minimale du modèle pour recommander
 *   recommendation.defaultTeam     (aucune) équipe suggérée « en cas de doute » quand le modèle
 *                                          n'est pas assez sûr (ex. l'équipe d'accueil)
 *   recommendation.timeoutSeconds  (5)     délai maximal d'attente du modèle
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsLogger = require('./ticketsLogger');
const { getDecisionSettings, askDecisionModel } = require('./decisionModel');

const DEFAULTS = { enabled: true, minProbability: 0.8, timeoutSeconds: 5 };

const getSettings = () => {
    const settings = ticketsConfig.getTicketsConfig().recommendation || {};
    return {
        enabled: settings.enabled ?? DEFAULTS.enabled,
        minProbability: settings.minProbability ?? DEFAULTS.minProbability,
        defaultTeam: settings.defaultTeam || null,
        timeoutMs: (settings.timeoutSeconds ?? DEFAULTS.timeoutSeconds) * 1000
    };
};

// Équipes qui ont décrit leur périmètre
const getDescribedTeams = () => ticketsConfig.getAllTeams()
    .filter(team => typeof team.topics === 'string' && team.topics.trim());

// Identifiant sans accent ni espace, unique par équipe, pour nommer les options de la question
const optionKeys = (teams) => {
    const used = new Set();
    return teams.map((team, index) => {
        let key = team.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `equipe_${index + 1}`;
        if (used.has(key)) key = `${key}_${index + 1}`;
        used.add(key);
        return key;
    });
};

const buildQuestion = (teams, keys) => ({
    team: {
        type: 'choice',
        instructions: "Un membre d'une communauté Discord associative ouvre un ticket pour contacter une équipe. D'après l'objet de sa demande, quelle équipe est la mieux placée pour la traiter ? Choisis l'équipe dont le périmètre correspond le mieux au sujet, sans te laisser influencer par le ton ou l'urgence apparente du message.",
        criteria: Object.fromEntries(teams.map((team, i) => [
            keys[i],
            `L'équipe ${team.name} traite : ${team.topics.trim().replace(/[.\s]+$/, '')}.`
        ]))
    }
});

/**
 * Recommande une équipe pour l'objet d'une demande.
 * Ne lève jamais d'erreur : sans recommandation (service indisponible, modèle hésitant…) le membre
 * choisit simplement l'équipe lui-même, comme avant.
 *
 * @param {string} subject - l'objet saisi par le membre
 * @returns {Promise<{team: Object, probability: number, confident: boolean} | null>}
 *          confident=false : recommandation « en cas de doute » (équipe par défaut)
 */
const recommendTeam = async (Client, subject) => {
    const settings = getSettings();
    const teams = getDescribedTeams();

    if (!settings.enabled || teams.length < 2 || !subject?.trim()) return null;
    if (!getDecisionSettings(Client).apiKey) return null;

    try {
        const keys = optionKeys(teams);
        const answers = await askDecisionModel(Client, {
            state: `Objet de la demande du membre : « ${subject.trim()} »`,
            questions: buildQuestion(teams, keys),
            timeoutMs: settings.timeoutMs
        });

        const probabilities = answers.team?.probabilities;
        if (!probabilities || typeof probabilities !== 'object') throw new Error('Decision model: unexpected response');

        const scored = teams.map((team, i) => ({ team, probability: Number(probabilities[keys[i]]) || 0 }))
            .sort((a, b) => b.probability - a.probability);
        const best = scored[0];

        Client.log?.info?.(`[Tickets] recommendation: ${scored.map(s => `${s.team.name}=${s.probability.toFixed(2)}`).join(' ')} (threshold ${settings.minProbability})`);

        if (best.probability >= settings.minProbability) {
            return { team: best.team, probability: best.probability, confident: true };
        }

        // Le modèle hésite : on suggère l'équipe par défaut, si elle est configurée
        const fallback = scored.find(s => s.team.name === settings.defaultTeam);
        return fallback ? { team: fallback.team, probability: fallback.probability, confident: false } : null;
    } catch (error) {
        ticketsLogger.logError('ticketRecommendation', error);
        return null;
    }
};

/**
 * Message affiché au membre, au-dessus du bouton et du choix de l'équipe
 */
const buildRecommendationEmbed = (recommendation) => {
    const { team, confident } = recommendation;
    const topics = team.topics.trim().replace(/[.\s]+$/, '');

    const description = confident
        ? `D'après l'objet de votre demande, l'équipe **${team.name}** est la mieux placée pour vous répondre. Elle traite : ${topics}.`
        : `Nous n'avons pas pu déterminer clairement quelle équipe est concernée. En cas de doute, nous vous conseillons de commencer par l'équipe **${team.name}**. Elle traite : ${topics}.`;

    return new EmbedBuilder()
        .setColor('f0b232')
        .setTitle(`Nous vous conseillons l'équipe ${team.name}`)
        .setDescription(description);
};

/**
 * Bouton qui ouvre directement le ticket pour l'équipe recommandée
 */
const buildRecommendationButton = (recommendation) => {
    const { team } = recommendation;
    const button = new ButtonBuilder()
        .setCustomId(`openTicketTeam_${encodeURIComponent(team.name)}`)
        .setLabel(`Contacter l'équipe ${team.name}`.slice(0, 80))
        .setStyle(ButtonStyle.Secondary);

    if (team.emojiID) button.setEmoji(team.emojiID);

    return new ActionRowBuilder().addComponents(button);
};

module.exports = { recommendTeam, buildRecommendationEmbed, buildRecommendationButton };
