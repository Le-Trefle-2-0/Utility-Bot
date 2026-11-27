const { EmbedBuilder, MessageFlags } = require('discord.js');
const resources = require('../Utility/resources');

module.exports = {
    description: 'Modifier une section du message des ressources utiles (gérer le serveur)',
    guilds: ['mainGuildID'],
    options: [],
    run: async (Client, interaction) => {
        if (!resources.canManage(interaction)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('Red').setDescription(':x: | Cette commande nécessite la permission « Gérer le serveur ».')],
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({
            content: 'Quelle section souhaitez-vous modifier ?',
            components: [resources.sectionMenu('resourcesEdit', resources.defaults, 'Choisir une section')],
            flags: MessageFlags.Ephemeral
        });
    }
};
