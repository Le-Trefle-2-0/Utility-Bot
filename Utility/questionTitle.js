const { createChatCompletion } = require('./llmProvider');

const MAX_TITLE_LENGTH = 100;
const MAX_INPUT_CHARS = 2000;
// showModal doit être appelé dans les 3 s suivant l'interaction
const DEFAULT_TIMEOUT_MS = 2200;

const SYSTEM_PROMPT = `Tu es un assistant dédié à accompagner un service de support à répondre aux questions d'utilisateurs. Il t'est ici demandé de générer un titre court (80 caractères maximum) résumant la question, utilisé derrière pour l'indexation des questions passées. Réponds uniquement par le titre, sans guillemets, sans point final, sans "bonjour" ni "ça vous convient ?". Juste le titre !`;

function clean(text) {
    const cleaned = (text || '')
        .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^["«“'`]+|["»”'`]+$/g, '')
        .replace(/[.\s]+$/, '')
        .trim();
    return Array.from(cleaned).slice(0, MAX_TITLE_LENGTH).join('');
}

// Titre de secours : début du message d'origine
function fallbackTitle(content) {
    return clean(content);
}

async function generateQuestionTitle(Client, content, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const fallback = fallbackTitle(content);
    if (!fallback) return '';

    let timer;
    const timeout = new Promise(resolve => {
        timer = setTimeout(() => resolve(null), timeoutMs);
    });

    try {
        const completion = createChatCompletion(Client, {
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: content.slice(0, MAX_INPUT_CHARS) }
            ],
            temperature: 0.4,
            max_tokens: 100,
            reasoning_effort: 'none'
        });
        // Évite un unhandledRejection si la requête échoue après le timeout
        completion.catch(() => {});

        const data = await Promise.race([completion, timeout]);
        if (!data) {
            Client.log?.warn?.(`[Question] Génération du titre trop lente (> ${timeoutMs} ms), titre de secours utilisé`);
            return fallback;
        }
        const title = clean(data.choices?.[0]?.message?.content);
        if (!title) {
            Client.log?.warn?.(`[Question] Le LLM a renvoyé un titre vide, titre de secours utilisé (${data.choices?.[0]?.finish_reason || 'raison inconnue'})`);
            return fallback;
        }
        return title;
    } catch (err) {
        Client.log?.warn?.(`[Question] Génération du titre impossible : ${err.message}`);
        return fallback;
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { generateQuestionTitle };
