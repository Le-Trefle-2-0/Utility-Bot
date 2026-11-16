const { MessageFlags, PermissionsBitField } = require('discord.js');
const closeExceptions = require('../Utility/closeExceptions');

module.exports = {
    description: 'Supprimer une exception de fermeture (retour à l\'horaire normal)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'date', desc: 'Date de l\'exception, JJ/MM ou JJ/MM/AAAA', type: 'string', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: ':x: | Permission insuffisante.', flags: MessageFlags.Ephemeral });
        }

        const key = closeExceptions.parseDate(interaction.options.getString('date'));
        if (!key) return interaction.reply({ content: ':x: | Date invalide, utilisez le format JJ/MM ou JJ/MM/AAAA.', flags: MessageFlags.Ephemeral });

        const removed = await closeExceptions.removeException(Client, key);
        interaction.reply({
            content: removed ? ':white_check_mark: | Exception supprimée, l\'horaire normal s\'applique.' : ':x: | Aucune exception pour cette date.',
            flags: MessageFlags.Ephemeral
        });
    }
};
