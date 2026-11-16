/**
 * Message de bienvenue public : envoyé quand le membre a accepté le règlement
 * (voir memberVerification.js), et non plus à son arrivée sur le serveur.
 */

const { createChatCompletion } = require('./llmProvider');

async function sendPublicWelcome(Client, member) {
    const channelID = Client.settings.publicWelcomeChannelID;
    const channel = member.guild.channels.cache.get(channelID);
    if (!channel) return;

    const message = await getPublicWelcomeMessage(Client, member);
    if (!message) return;

    const sentMessage = await channel.send(message);

    const emojiID = Client.settings.publicWelcomeEmojiID;
    if (emojiID) {
        try {
            await sentMessage.react(emojiID);
        } catch (err) {
            console.error(`Impossible de réagir avec l'emoji ${emojiID} :`, err);
            await sentMessage.react('👋');
        }
    } else {
        await sentMessage.react('👋');
    }
}

async function getPublicWelcomeMessage(Client, member) {
    const pseudo = member.displayName;
    const bio = member.user.bio || '';
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const fallback = `Bienvenue à ${member} qui vient de nous rejoindre ! N'hésitez pas à lui souhaiter la bienvenue ! 👋`;
    if (!Client.llmProvider?.enabled) return fallback;

    try {
        const data = await createChatCompletion(Client, {
            messages: [
                { role: 'system', content: PUBLIC_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Pseudo : ${pseudo}
Bio : ${bio || '(aucune)'}` },
                    ]
                }
            ],
            temperature: 0.6,
            max_tokens: 200,
            reasoning_effort: "none"
        });
        let content = data.choices?.[0]?.message?.content;
        if (!content) return fallback;

        // Remove thinking process if present
        content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
        
        // Remove quotes if the LLM wrapped the message in them
        if (content.startsWith('"') && content.endsWith('"')) {
            content = content.substring(1, content.length - 1);
        }

        return content.replace('[member]', `<@${member.id}>`);

    } catch (err) {
        console.error('Erreur API LLM (public).');
        return fallback;
    }
}

const PUBLIC_SYSTEM_PROMPT = `Tu es l'hôte d'accueil du serveur Discord Le Trèfle 2.0. Ta mission est de générer un message court et chaleureux en français pour annoncer l'arrivée d'un nouveau membre à toute la communauté et les inviter à l'accueillir.

Tu recevras le pseudo du membre.
Le message doit être court (1 à 2 phrases maximum).
Utilise "[member]" pour mentionner le nouveau membre.
Le ton doit être enthousiaste, bienveillant et communautaire.
Tu peux faire une petite remarque légère sur l'avatar ou la bio si c'est inspirant, mais reste bref.
N'utilise pas de JSON, réponds directement avec le texte du message.

Exemple de ton :
"Oh, un nouveau trèfle pointe son nez ! Bienvenue parmi nous [member] ! N'hésitez pas à lui faire un petit coucou les amis ! 🍀"
"Regardez qui nous rejoint ! Bienvenue [member]. On adore déjà ton avatar ! La communauté est ravie de t'accueillir. 👋"
`;

module.exports = { sendPublicWelcome };
