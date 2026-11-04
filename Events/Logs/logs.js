const { EmbedBuilder } = require("discord.js");

const colors = {
    server: '9bd2d2', // vert clair trèfle
    textual: '2986cc', // bleu
    moderation: '8B0000', // rouge ocre
    voice: 'ce7e00', // orange
    member: '008000' // vert
};

/**
 * Envoie un log dans le salon de la catégorie demandée (member, server, textual, voice, moderation).
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
        const channel = Client.channels.cache.get(Client.settings.logs?.[category]);
        if (!channel) return;

        const embedArray = (Array.isArray(embeds) ? embeds : [embeds]).slice(0, 10);
        for (const embed of embedArray) {
            if (!embed.data.color) embed.setColor(colors[category]);
            if (!embed.data.timestamp) embed.setTimestamp();
        }

        await channel.send({ embeds: embedArray, components, files, allowedMentions: { parse: [] } });
    } catch (error) {
        Client.log?.error?.(`Envoi du log « ${category} » impossible : ${error.message}`);
    }
};
