const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Op } = require('sequelize');
const { parseEmoji, parseParisDate, invalidateEventCache, tick } = require('../Utility/collect');

const MAX_DURATION_MS = 120 * 24 * 60 * 60 * 1000;
const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Créer un évènement de collecte d\'émojis, avec classement (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'nom', desc: 'Nom de l\'évènement (ex : Les cadeaux de Noël)', type: 'string', required: true },
        { name: 'emoji', desc: 'Émoji à collecter (ex : 🎁)', type: 'string', required: true },
        { name: 'debut', desc: 'Début, heure de Paris (JJ/MM/AAAA ou JJ/MM/AAAA HH:MM)', type: 'string', required: true },
        { name: 'fin', desc: 'Fin, heure de Paris (sans heure : le jour entier est inclus)', type: 'string', required: true },
        { name: 'frequence', desc: 'Environ 1 émoji tous les N messages (30 par défaut, de 5 à 500)', type: 'int', required: false },
        { name: 'salon', desc: 'Limiter l\'évènement à ce salon ou à cette catégorie (tous par défaut)', type: 'channel', required: false },
        { name: 'salon_annonce', desc: 'Salon des annonces de début et de fin (celui-ci par défaut)', type: 'channel', required: false }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }
        const fail = (text) => interaction.reply({ embeds: [errorEmbed(text)], flags: MessageFlags.Ephemeral });

        const name = interaction.options.getString('nom').trim().slice(0, 100);
        const emoji = parseEmoji(interaction.options.getString('emoji'));
        const startsAt = parseParisDate(interaction.options.getString('debut'));
        const endsAt = parseParisDate(interaction.options.getString('fin'), true);
        const spawnEvery = interaction.options.getInteger('frequence') ?? 30;
        const channel = interaction.options.getChannel('salon');
        const announceChannel = interaction.options.getChannel('salon_annonce') ?? interaction.channel;

        if (!emoji) return fail('Émoji invalide : indique un seul émoji (Unicode, ou personnalisé de ce serveur).');
        if (emoji.raw.startsWith('<') && !interaction.guild.emojis.cache.has(emoji.key)) return fail('Cet émoji personnalisé n\'appartient pas à ce serveur : je ne pourrai pas l\'utiliser.');
        if (!startsAt || !endsAt) return fail('Date invalide : utilise le format `JJ/MM/AAAA` ou `JJ/MM/AAAA HH:MM` (ex : `01/12/2026`).');
        if (endsAt <= startsAt) return fail('La fin doit être postérieure au début.');
        if (endsAt <= new Date()) return fail('La date de fin est déjà passée.');
        if (endsAt - startsAt > MAX_DURATION_MS) return fail('L\'évènement ne peut pas durer plus de 120 jours.');
        if (spawnEvery < 5 || spawnEvery > 500) return fail('La fréquence doit être comprise entre 5 et 500 messages.');
        if (!announceChannel?.isTextBased()) return fail('Le salon d\'annonce doit être un salon textuel.');

        const overlapping = await Client.CollectEvents.findOne({
            where: { guildID: interaction.guild.id, startsAt: { [Op.lt]: endsAt }, endsAt: { [Op.gt]: startsAt } }
        });
        if (overlapping) return fail(`Cet évènement chevauche **${overlapping.name}** (du <t:${Math.floor(overlapping.startsAt / 1000)}:d> au <t:${Math.floor(overlapping.endsAt / 1000)}:d>). Un seul évènement de collecte à la fois : termine-le avec \`/collecteend\` ou choisis d'autres dates.`);

        const event = await Client.CollectEvents.create({
            guildID: interaction.guild.id,
            name,
            emoji: emoji.raw,
            startsAt,
            endsAt,
            spawnEvery,
            channelID: channel?.id ?? null,
            announceChannelID: announceChannel.id,
            createdBy: interaction.user.id
        });
        invalidateEventCache(interaction.guild.id);
        tick(Client).catch(() => null); // annonce immédiate si l'évènement commence déjà

        const ts = (d) => Math.floor(d.getTime() / 1000);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('8cc088')
                    .setTitle(`${event.emoji} Évènement créé : ${event.name}`)
                    .setDescription([
                        `**Début :** <t:${ts(startsAt)}:F>`,
                        `**Fin :** <t:${ts(endsAt)}:F>`,
                        `**Fréquence :** environ 1 émoji tous les ${spawnEvery} messages`,
                        `**Salons :** ${channel ? `${channel}` : 'tous (hors salons ignorés dans `settings.json`)'}`,
                        `**Annonces :** ${announceChannel}`
                    ].join('\n'))
            ],
            flags: MessageFlags.Ephemeral
        });
    }
};
