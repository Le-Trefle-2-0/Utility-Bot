const { MessageFlags, PermissionsBitField } = require('discord.js');
const closeExceptions = require('../Utility/closeExceptions');

module.exports = {
    description: 'Lister les exceptions de fermeture à venir',
    guilds: ['mainGuildID'],
    run: async (Client, interaction) => {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: ':x: | Permission insuffisante.', flags: MessageFlags.Ephemeral });
        }

        const rows = (await Client.CloseExceptions.findAll({ order: [['date', 'ASC']] }));
        const lines = rows.map(row => {
            const ts = Math.floor(closeExceptions.computeCloseDate(Client, row.date, row.closeTime).getTime() / 1000);
            return `• ${row.date.split('-').reverse().join('/')} → fermeture le <t:${ts}:F>`;
        });
        interaction.reply({
            content: lines.length ? `**Exceptions de fermeture :**\n${lines.join('\n')}` : 'Aucune exception de fermeture programmée.',
            flags: MessageFlags.Ephemeral
        });
    }
};
