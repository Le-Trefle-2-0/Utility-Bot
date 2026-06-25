const { Collection, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const zlib = require('zlib');

// Map pour stocker les données de spam (en mémoire)
// Clé : userId
// Valeur : { messages: [{ content, timestamp, channelId }], lastMessageTimestamp, count }
const usersData = new Collection();

// Configuration des seuils (pourraient être déplacés dans settings.json à l'avenir)
const SPAM_THRESHOLD_MESSAGES = 5; // Nombre de messages consécutifs
const SPAM_INTERVAL_MS = 5000;    // Intervalle de temps pour les messages consécutifs
const MENTION_THRESHOLD = 5;      // Nombre maximum de mentions autorisées
const MULTI_CHANNEL_THRESHOLD = 3; // Nombre de salons différents pour le même message

// Configuration Anti-Scam
const SCAM_KEYWORDS = [
    'crypto', 'investment', 'investir', 'bitcoin', 'btc', 'eth', 'ethereum', 'binance', 'airdrop', 'giveaway', 'free nitro',
    'gift', 'cadeau', 'argent', 'money', 'profit', 'earn', 'gagner', 'wallet', 'portefeuille', 'elon musk', 'tesla',
    'twitter-gift', 'discord-nitro', 'partnership', 'partenariat'
];

const SCAM_LINKS = [
    'bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'shorturl.at', 'cutt.ly', 'dub.sh',
    'discorcl', 'discord-app', 'dlscord', 'disscord', 'free-nitro', 'nitro-gift'
];

/**
 * Algorithme local de détection de contenu généré par IA
 * Version 3.0 : Compression, Ponctuation, Formalisme et Statistiques Lexicales.
 */
function analyzeAIText(text) {
    if (!text || text.length < 20) return { score: 0, details: "Texte trop court" };

    const cleanText = text.replace(/[^\w\sàâéèêëîïôûùç']/gi, ' ').toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = cleanText.match(/\b[\wàâéèêëîïôûùç']+\b/g) || [];
    
    if (words.length < 6) return { score: 0, details: "Pas assez de mots" };

    // --- 1. Diversité Lexicale (TTR) ---
    const uniqueWords = new Set(words);
    const lexicalDiversity = uniqueWords.size / words.length;

    // --- 2. Burstiness (Variance de la longueur des phrases) ---
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentences.length;
    const sentenceVariance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgSentenceLength, 2), 0) / sentences.length;
    const burstiness = Math.sqrt(sentenceVariance) / (avgSentenceLength || 1);

    // --- 3. Ratio de Compression (Indicateur de structure) ---
    // Un texte IA est souvent plus "ordonné" et se compresse plus efficacement.
    let compressionRatio = 1;
    try {
        const compressed = zlib.deflateSync(Buffer.from(text));
        compressionRatio = compressed.length / text.length;
    } catch (e) {}

    // --- 4. Analyse du Formalisme et de la Ponctuation ---
    // L'IA respecte presque toujours : Majuscule initiale et Point final.
    const hasProperStart = /^[A-ZÀÂÉÈÊËÎÏÔÛÙÇ]/.test(text.trim());
    const hasProperEnd = /[.!?]$/.test(text.trim());
    
    // Compter les phrases qui respectent le formalisme (Maj + Point)
    let formalSentences = 0;
    sentences.forEach(s => {
        const trimmed = s.trim();
        if (trimmed.length > 0 && /^[A-ZÀÂÉÈÊËÎÏÔÛÙÇ]/.test(trimmed)) formalSentences++;
    });
    const formalRatio = formalSentences / (sentences.length || 1);

    // --- 5. Détection d'Argot et Langage Informel (Poids négatif pour l'IA) ---
    const informalWords = [
        'ptdr', 'mdr', 'lol', 'xd', 'brb', 'idk', 'jsp', 'pk', 'pck', 'pcke', 'dsl', 'stp', 'svp', 'tkt', 'cv', 'slt', 'cc',
        'mouais', 'ouais', 'oké', 'bah', 'euh', 'heu', 'genre', 'truc', 'machin', 'vla', 'voila', 'voilà'
    ];
    const informalCount = words.filter(w => informalWords.includes(w)).length;
    const informalDensity = informalCount / words.length;

    // --- 6. Connecteurs Logiques & Patterns IA ---
    const transitionWords = [
        'cependant', 'néanmoins', 'toutefois', 'pourtant', 'en revanche', 'par contre', 
        'en outre', 'de plus', 'par ailleurs', 'ainsi', 'donc', 'en conséquence', 
        'par conséquent', 'enfin', 'finalement', 'somme toute', 'en conclusion', 
        'globalement', 'notamment', 'particulièrement', 'effectivement', 'précisément',
        'tout d\'abord', 'premièrement', 'deuxièmement', 'en effet'
    ];
    const transitionCount = words.filter(w => transitionWords.includes(w)).length;
    const transitionDensity = transitionCount / words.length;

    const aiPatterns = [
        'en tant qu', 'modèle de langage', 'n\'hésitez pas à', 'j\'espère que cela',
        'pour résumer', 'en conclusion', 'voici quelques', 'il est important de',
        'selon les informations', 'considérant que', 'd\'un point de vue',
        'tout d\'abord', 'pour conclure', 'notamment', 'en effet', 'par ailleurs'
    ];
    let patternScore = 0;
    aiPatterns.forEach(p => {
        const regex = new RegExp(p.replace(/'/g, "\\'"), 'gi');
        const matches = text.match(regex);
        if (matches) patternScore += 0.15 * matches.length;
    });

    // --- 7. Structure de Liste ---
    const listPatterns = text.match(/^[-*•\d+.]\s+/gm);
    const hasListStructure = listPatterns && listPatterns.length >= 2;

    // --- CALCUL DU SCORE FINAL ---
    let score = 0;

    // A. Régularité (Burstiness) : L'IA est monotone.
    if (burstiness < 0.20) score += 0.30;
    else if (burstiness < 0.35) score += 0.15;

    // B. Compression (Plus c'est bas, plus c'est structuré)
    // Pour les textes courts, un ratio < 0.85 est souvent signe de structure.
    if (compressionRatio < 0.80) score += 0.25;
    else if (compressionRatio < 0.90) score += 0.10;

    // C. Formalisme Discord (Le plus gros indicateur pour les bots)
    if (hasProperStart && hasProperEnd) score += 0.20;
    if (formalRatio > 0.8) score += 0.15;
    
    // D. Connecteurs et Patterns
    if (transitionDensity > 0.08) score += 0.20;
    score += Math.min(patternScore, 0.40);

    // E. Structure
    if (hasListStructure) score += 0.20;

    // F. Bonus de Diversité Lexicale
    // L'IA a souvent une diversité élevée (autour de 0.7-0.9)
    if (lexicalDiversity > 0.75) score += 0.10;

    // --- MALUS (Points qui diminuent la probabilité d'IA) ---
    // 1. Présence d'informel (L'IA est rarement informelle sauf si on lui demande)
    if (informalDensity > 0.05) score -= 0.40;
    if (informalCount > 0) score -= 0.15;

    // 2. Absence totale de ponctuation (Typique humain Discord)
    if (!hasProperStart && !hasProperEnd && formalRatio === 0) score -= 0.30;

    return {
        score: Math.max(0, Math.min(score, 1)),
        metrics: {
            diversity: lexicalDiversity.toFixed(2),
            burstiness: burstiness.toFixed(2),
            compression: compressionRatio.toFixed(2),
            formalRatio: formalRatio.toFixed(2),
            informalDensity: informalDensity.toFixed(2),
            transitionDensity: transitionDensity.toFixed(2),
            patternScore: patternScore.toFixed(2)
        }
    };
}

module.exports = async (Client, message) => {
    // Ne pas vérifier les bots ou les messages en dehors des serveurs
    if (!message.guild && !message.author.bot) {
        const DM_SYSTEM_PROMPT = `Tu es le bot utilitaire du serveur Discord Le Trèfle 2.0, une association d'écoute et de soutien moral. Un membre vient de t'envoyer un message en privé (DM).

                                        Analyse ce message et réponds en français, en tutoyant, avec UN SEUL message court (1-3 phrases).
                                        
                                        CAS 1 - Si le message exprime, même indirectement, une détresse, un mal-être, une demande d'aide ou d'écoute, ou toute situation qui mériterait l'attention d'un Bénévole Écoutant : réponds de façon chaleureuse et sérieuse (sans humour), explique que tu n'es qu'un bot et donc pas en mesure d'apporter une vraie écoute, et invite la personne à se rendre dans <#720266206560387163> pour être mise en contact avec un Bénévole Écoutant.
                                        
                                        CAS 2 - Pour tout autre message (question, blague, message random, test...) : réponds sur un ton léger, amical et un peu taquin, rebondis brièvement sur ce qu'a écrit la personne si pertinent, précise que tu n'es qu'un bot pas vraiment doué pour la conversation, et invite-la à aller papoter dans <#718248830428119121> si elle veut échanger avec la communauté.
                                        
                                        Dans les deux cas : un seul message, pas de question en retour, ne propose pas de continuer la conversation avec toi.
                                        
                                        Réponds UNIQUEMENT avec un objet JSON de la forme {"case": "ecoute" ou "autre", "message": "ton message ici"}.`;
        try {
            message.channel.sendTyping();
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [
                        { role: 'system', content: DM_SYSTEM_PROMPT },
                        { role: 'user', content: message.content }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content?.trim();
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) content = jsonMatch[0];

            const parsed = JSON.parse(content);
            await message.channel.send(parsed.message);

        } catch (err) {
            console.error('Erreur DM LLM :', err);
            await message.channel.send("Hello ! Je suis un bot donc pas top pour la discussion 😅 Si tu veux échanger, file faire un tour sur le serveur !");
        }
        return;
    }
    if (message.author.bot) return;

    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

    const now = Date.now();
    const userId = message.author.id;
    let userData = usersData.get(userId);

    if (!userData) {
        userData = {
            messages: [],
            lastAlert: 0
        };
        usersData.set(userId, userData);
    }

    // Ajouter le message actuel à l'historique de l'utilisateur
    userData.messages.push({
        id: message.id,
        content: message.content,
        timestamp: now,
        channelId: message.channel.id
    });

    // Nettoyer les messages vieux de plus de 10 secondes
    userData.messages = userData.messages.filter(m => now - m.timestamp < 10000);

    let spamType = null;
    let triggerDetails = "";

    // 1. Détection de mentions excessives
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount > MENTION_THRESHOLD) {
        spamType = "Mentions excessives";
        triggerDetails = `A envoyé ${mentionCount} mentions dans un seul message.`;
    }

    // 2. Détection de messages consécutifs rapides
    if (!spamType) {
        const recentMessages = userData.messages.filter(m => now - m.timestamp < SPAM_INTERVAL_MS);
        if (recentMessages.length >= SPAM_THRESHOLD_MESSAGES) {
            spamType = "Spam de messages rapides";
            triggerDetails = `A envoyé ${recentMessages.length} messages en moins de ${SPAM_INTERVAL_MS / 1000} secondes.`;
        }
    }

    // 3. Détection de spam multi-salons (même contenu dans plusieurs salons)
    if (!spamType) {
        const sameContentMessages = userData.messages.filter(m => m.content === message.content && m.content.length >= 1);
        const uniqueChannels = new Set(sameContentMessages.map(m => m.channelId));
        if (uniqueChannels.size >= MULTI_CHANNEL_THRESHOLD) {
            spamType = "Spam multi-salons";
            triggerDetails = `A envoyé le même message dans ${uniqueChannels.size} salons différents.`;
        }
    }

    // 4. Détection d'arnaques (Anti-Scam)
    let scamType = null;
    if (!spamType) {
        let contentToAnalyze = message.content.toLowerCase();
        
        // --- ÉVOLUTION 1 : Analyse OCR des images ---
        if (Client.settings.antiScam?.ocrEnabled && message.attachments.size > 0) {
            const image = message.attachments.first();
            if (image.contentType?.startsWith('image/')) {
                try {
                    const { data: { text } } = await Tesseract.recognize(image.url, 'eng+fra');
                    contentToAnalyze += " " + text.toLowerCase();
                } catch (err) {
                    Client.log.error(`Erreur OCR : ${err.message}`);
                }
            }
        }

        // --- ÉVOLUTION 2 : Vérification renforcée des liens ---
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = message.content.match(urlRegex) || [];
        const hasLinks = links.length > 0;
        
        // Vérification des liens suspects (phishing/redirection)
        const foundScamLink = SCAM_LINKS.find(link => contentToAnalyze.includes(link));
        
        // Vérification des mots-clés suspects
        const matchedKeywords = SCAM_KEYWORDS.filter(keyword => contentToAnalyze.includes(keyword));

        // --- ÉVOLUTION 3 : Blocage des comptes récents envoyant des liens ---
        const minAgeDays = Client.settings.antiScam?.minAccountAgeDays || 0;
        const accountAgeDays = (Date.now() - message.author.createdTimestamp) / (1000 * 60 * 60 * 24);
        
        if (hasLinks && accountAgeDays < minAgeDays && !isAdmin) {
            scamType = "Compte trop récent avec lien";
            triggerDetails = `Compte créé il y a ${Math.floor(accountAgeDays)} jour(s) (minimum requis : ${minAgeDays} jours) envoyant un lien.`;
        } else if (foundScamLink && matchedKeywords.length >= 1) {
            scamType = "Arnaque suspectée (Lien + Mots-clés)";
            triggerDetails = `Contient un lien suspect (\`${foundScamLink}\`) et des mots-clés : ${matchedKeywords.join(', ')}.`;
        } else if (matchedKeywords.length >= 3) {
            scamType = "Arnaque suspectée (Mots-clés multiples)";
            triggerDetails = `Contient plusieurs mots-clés suspects (texte ou image) : ${matchedKeywords.join(', ')}.`;
        }
    }

    // --- ÉVOLUTION : Détection de contenu généré par IA (Algorithme Local) ---
    let aiDetectionData = null;
    const aiConfig = Client.settings.aiDetection;

    if (!spamType && !scamType && aiConfig?.enabled) {
        const textToAnalyze = message.content.trim();
        if (textToAnalyze.length >= (aiConfig.minCharacterCount || 50)) {
            const analysis = analyzeAIText(textToAnalyze);
            const sensitivity = aiConfig.sensitivity || 0.7;

            if (aiConfig.debug) {
                console.log(`[DEBUG AI] Texte analysé (${textToAnalyze.length} chars): "${textToAnalyze.substring(0, 50)}..."`);
                console.log(`[DEBUG AI] Score: ${analysis.score.toFixed(2)} (Seuil: ${sensitivity})`);
                console.log(`[DEBUG AI] Métriques:`, analysis.metrics);
            }

            if (analysis.score >= sensitivity) {
                aiDetectionData = {
                    confidence: (analysis.score * 100).toFixed(1),
                    isAI: true
                };
            }
        }
    }

    // Si un spam, une arnaque ou du contenu IA est détecté
    if (spamType || scamType || aiDetectionData) {
        const detectionType = spamType || scamType || "Contenu généré par IA";
        try {
            // Supprimer le message si ce n'est pas un admin (sauf pour l'IA où on ne fait qu'alerter)
            if (!isAdmin && (spamType || scamType)) {
                await message.delete().catch(() => null);
            }

            // Éviter de spammer les alertes
            if (now - userData.lastAlert > 5000) {
                userData.lastAlert = now;

                const isScam = !!scamType;
                const isAI = !!aiDetectionData;
                
                let logTitle;
                if (isAI) {
                    logTitle = `🤖 Détection IA - ${aiDetectionData.confidence}% de certitude`;
                } else {
                    logTitle = isAdmin 
                        ? `⚠️ Activité Suspecte (Admin) - ${isScam ? 'Scam' : 'Spam'}` 
                        : `🚫 Détection ${isScam ? 'Anti-Arnaque' : 'Anti-Spam'}`;
                }

                let logMessage = `**Utilisateur :** ${message.author.tag} (${message.author.id}) ${isAdmin ? "*(Administrateur)*" : ""}\n` +
                                   `**Type :** ${detectionType}\n` +
                                   `**Détails :** ${isAI ? `Le message semble avoir été rédigé par une Intelligence Artificielle.` : triggerDetails}\n` +
                                   `**Salon :** <#${message.channel.id}>\n`;
                
                if (isAI) {
                    logMessage += `**Action :** 🔎 Analyse uniquement\n`;
                } else {
                    logMessage += `**Action :** ${isAdmin ? "⚠️ Alerte uniquement (Admin)" : "🗑️ Message supprimé"}\n`;
                }
                
                logMessage += `**Contenu :** \`\`\`${message.content.substring(0, 1000) || "[Message vide ou média]"}\`\`\``;

                const components = [];
                // Pour l'IA, on propose aussi le bouton de suppression au cas où
                if (isAdmin || isScam || isAI) {
                    const deleteButton = new ButtonBuilder()
                        .setCustomId(`spam_delete_messages_${message.author.id}_${message.channel.id}`)
                        .setLabel(isScam ? 'Supprimer les messages du scammer' : 'Supprimer les messages récents')
                        .setStyle(ButtonStyle.Danger);
                    
                    components.push(new ActionRowBuilder().addComponents(deleteButton));
                }

                const sendLog = require('./Logs/logs.js');
                await sendLog(Client, 'textual', logTitle, logMessage, isAI ? 'AI Detection System' : (isScam ? 'Anti-Scam System' : 'Anti-Spam System'), null, components);
            }
        } catch (error) {
            Client.log.error(`Erreur lors du traitement anti-spam/arnaque/IA : ${error.message}`);
        }
    }
};
