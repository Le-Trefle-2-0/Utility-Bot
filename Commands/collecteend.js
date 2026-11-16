const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Op } = require('sequelize');
const { invalidateEventCache, tick } = require('../Utility/collect');

const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Terminer immédiatement l\'évènement de collecte en cours ou à venir (administrateurs)',
    guilds: ['mainGuildID'],
    options: [],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const now = new Date();
        const event = await Client.CollectEvents.findOne({
            where: { guildID: interaction.guild.id, endsAt: { [Op.gt]: now } },
            order: [['startsAt', 'ASC']]
        });
        if (!event) {
            return interaction.reply({ embeds: [errorEmbed('Aucun évènement de collecte en cours ou à venir.')], flags: MessageFlags.Ephemeral });
        }

        const started = event.startsAt <= now;
        // Un évènement pas encore commencé est simplement annulé (aucune annonce)
        await event.update({ endsAt: now, ...(started ? {} : { startsAt: now, startAnnounced: true, endAnnounced: true }) });
        invalidateEventCache(interaction.guild.id);
        if (started) await tick(Client); // annonce le classement final

        interaction.reply({
            embeds: [new EmbedBuilder().setColor('8cc088').setDescription(started
                ? `🍀 | **${event.name}** est terminé : le classement final a été annoncé.`
                : `🍀 | **${event.name}** a été annulé.`)],
            flags: MessageFlags.Ephemeral
        });
    }
};
