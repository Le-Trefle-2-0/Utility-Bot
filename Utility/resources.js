const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const defaults = require('./resourcesDefaults');

// Ces sections sont affichées en permanence, les autres passent par le menu déroulant
const MAIN_KEYS = ['urgences', 'frequentes'];
// Vert Le Trèfle 2.0 (voir Utility/rankCard.js)
const COLOR = '8cc088';
// Limite des champs de texte d'un formulaire Discord (inférieure à celle d'une description d'embed : 4096)
const MAX_LENGTH = 4000;
// Les embeds d'un même message sont limités à 6000 caractères au total, titres et pied de page compris
const MAIN_MAX_LENGTH = 2800;

const maxLength = (key) => MAIN_KEYS.includes(key) ? MAIN_MAX_LENGTH : MAX_LENGTH;

const canManage = (interaction) => interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

const findSection = (key) => defaults.find(section => section.key === key);

/** Section avec son contenu à jour : la version enregistrée en base prime sur la version par défaut. */
async function getSection(Client, key) {
    const section = findSection(key);
    if (!section) return null;
    const saved = await Client.ResourceSections.findByPk(key);
    return saved ? { ...section, content: saved.content } : section;
}

const sectionMenu = (customId, sections, placeholder) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(sections.map(({ key, title, emoji, description }) => ({ label: title, value: key, emoji, description })))
);

const publicMenu = () => sectionMenu('resources', defaults.filter(s => !MAIN_KEYS.includes(s.key)), 'Voir d\'autres ressources…');

const sectionEmbed = ({ title, emoji, content }) => new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${emoji} ${title}`)
    .setDescription(content);

async function buildMessage(Client) {
    const embeds = await Promise.all(MAIN_KEYS.map(async key => sectionEmbed(await getSection(Client, key))));
    embeds.at(-1).setFooter({ text: 'D\'autres ressources (écoute, addictions, violences…) sont disponibles dans le menu ci-dessous.' });
    return {
        embeds,
        components: [publicMenu()]
    };
}

/** Message actuellement publié sur le serveur, ou null s'il n'existe plus. */
async function fetchPublished(Client, guild) {
    const saved = await Client.ResourceMessages.findByPk(guild.id);
    if (!saved) return null;
    const channel = await guild.channels.fetch(saved.channelID).catch(() => null);
    return channel?.messages.fetch({ message: saved.messageID, force: true }).catch(() => null) ?? null;
}

/** Met à jour le message s'il est déjà dans ce salon, sinon le publie et supprime l'ancien. */
async function publish(Client, channel) {
    const previous = await fetchPublished(Client, channel.guild);
    const payload = await buildMessage(Client);

    if (previous && previous.channelId === channel.id) return { message: await previous.edit(payload), updated: true };

    const message = await channel.send(payload);
    await Client.ResourceMessages.upsert({ guildID: channel.guild.id, channelID: channel.id, messageID: message.id });
    await previous?.delete().catch(() => {});
    return { message, updated: false };
}

/** Répercute une modification sur le message publié. Renvoie null si rien n'est publié. */
async function refresh(Client, guild) {
    const message = await fetchPublished(Client, guild);
    return message ? message.edit(await buildMessage(Client)) : null;
}

module.exports = {
    maxLength, defaults, canManage, findSection, getSection, sectionMenu, publicMenu, sectionEmbed, buildMessage, publish, refresh
};
