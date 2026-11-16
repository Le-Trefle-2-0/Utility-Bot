const { EmbedBuilder } = require("discord.js");

const colors = {
    server: '9bd2d2', // vert clair trèfle
    textual: '2986cc', // bleu
    moderation: '8B0000', // rouge ocre
    voice: 'ce7e00', // orange
    member: '008000', // vert
    bot: '5865F2' // bleu Discord
};

/**
 * Les pseudos changent, pas les identifiants : chaque membre mentionné (<@id>) dans un log doit aussi
 * apparaître en clair, pour pouvoir retrouver son historique en cherchant son identifiant.
 * Les identifiants absents du texte sont ajoutés au pied de page.
 */
const MENTION = /<@!?(\d{17,20})>/g;

const embedTexts = (embed) => {
    const data = embed.data || {};
    return [data.title, data.description, data.author?.name, data.footer?.text,
        ...(data.fields || []).flatMap(field => [field.name, field.value])].filter(Boolean);
};

const ensureUserIDs = (embed) => {
    const texts = embedTexts(embed);
    const ids = new Set(texts.flatMap(text => [...text.matchAll(MENTION)].map(match => match[1])));
    if (!ids.size) return;

    const plain = texts.join(' ').replace(MENTION, '');
    const missing = [...ids].filter(id => !plain.includes(id)).slice(0, 10);
    if (!missing.length) return;

    const label = missing.length > 1 ? 'IDs' : 'ID';
    const existing = embed.data.footer?.text;
    const text = `${existing ? `${existing} • ` : ''}${label} : ${missing.join(', ')}`.slice(0, 2048);
    embed.setFooter({ text, iconURL: embed.data.footer?.icon_url });
};

/**
 * Envoie un log dans le salon de la catégorie demandée (member, server, textual, voice, moderation, bot ; « bot » retombe sur « server » s'il n'est pas configuré).
 *
 * Signature actuelle : (Client, category, embed | embed[], components?, files?)
 * Signature historique (toujours acceptée) : (Client, category, titre, description, pied de page, _, components)
 */
module.exports = async (Client, category, embeds, ...rest) => {
    let components = [];
    let files = [];

    if (typeof embeds === 'string') {
        const [description, footer, , legacyComponents] = rest;
        embeds = new EmbedBuilder().setTitle(embeds).setDescription(String(description ?? '').slice(0, 4000));
        if (footer) embeds.setFooter({ text: String(footer) });
        components = legacyComponents || [];
    } else {
        components = rest[0] || [];
        files = rest[1] || [];
    }

    try {
        const guild = Client.guilds.cache.get(Client.settings.mainGuildID);
        if (!guild) return;
        const channel = Client.channels.cache.get(Client.settings.logs?.[category] || (category === 'bot' ? Client.settings.logs?.server : undefined));
        if (!channel) return;

        const embedArray = (Array.isArray(embeds) ? embeds : [embeds]).slice(0, 10);
        for (const embed of embedArray) {
            if (!embed.data.color) embed.setColor(colors[category]);
            if (!embed.data.timestamp) embed.setTimestamp();
            ensureUserIDs(embed);
        }

        await channel.send({ embeds: embedArray, components, files, allowedMentions: { parse: [] } });
    } catch (error) {
        Client.log?.error?.(`Envoi du log « ${category} » impossible : ${error.message}`);
    }
};
