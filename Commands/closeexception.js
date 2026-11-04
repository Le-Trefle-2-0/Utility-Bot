const { MessageFlags, PermissionsBitField } = require('discord.js');
const closeExceptions = require('../Utility/closeExceptions');

module.exports = {
    description: 'Décaler la fermeture nocturne des salons pour une date (ex : réveillon)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'date', desc: 'Jour de la fermeture normale, JJ/MM ou JJ/MM/AAAA (ex : 31/12)', type: 'string', required: true },
        { name: 'heure', desc: 'Nouvelle heure de fermeture, ex : 1h00 (avant l\'horaire normal = après minuit)', type: 'string', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: ':x: | Permission insuffisante.', flags: MessageFlags.Ephemeral });
        }

        const key = closeExceptions.parseDate(interaction.options.getString('date'));
        const time = closeExceptions.parseTime(interaction.options.getString('heure'));
        if (!key) return interaction.reply({ content: ':x: | Date invalide, utilisez le format JJ/MM ou JJ/MM/AAAA.', flags: MessageFlags.Ephemeral });
        if (!time) return interaction.reply({ content: ':x: | Heure invalide, utilisez par exemple `1h00` ou `01:30`.', flags: MessageFlags.Ephemeral });

        const closeDate = await closeExceptions.setException(Client, key, closeExceptions.formatTime(time.hours, time.minutes), interaction.user.id);
        if (closeDate <= new Date()) {
            await closeExceptions.removeException(Client, key);
            return interaction.reply({ content: ':x: | Cette heure de fermeture est déjà passée.', flags: MessageFlags.Ephemeral });
        }

        const ts = Math.floor(closeDate.getTime() / 1000);
        interaction.reply({
            content: `:white_check_mark: | Pour le ${key.split('-').reverse().join('/')}, les salons fermeront exceptionnellement le <t:${ts}:F> (<t:${ts}:R>). Avertissement vocal 5 minutes avant.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
