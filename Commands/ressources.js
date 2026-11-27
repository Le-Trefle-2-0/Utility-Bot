const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const resources = require('../Utility/resources');

const embed = (color, text) => new EmbedBuilder().setColor(color).setDescription(text);

module.exports = {
    description: 'Publier le message des ressources utiles dans ce salon (gérer le serveur)',
    guilds: ['mainGuildID'],
    options: [],
    run: async (Client, interaction) => {
        if (!resources.canManage(interaction)) {
            return interaction.reply({ embeds: [embed('Red', ':x: | Cette commande nécessite la permission « Gérer le serveur ».')], flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.channel;
        const required = [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks];
        if (!channel.permissionsFor(interaction.guild.members.me)?.has(required)) {
            return interaction.reply({ embeds: [embed('Red', ':x: | Il me manque la permission de voir ce salon, d\'y écrire ou d\'y intégrer des liens.')], flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await Client.dbReady;
            const { message, updated } = await resources.publish(Client, channel);
            await interaction.editReply({
                embeds: [embed('8cc088', `:white_check_mark: | Message des ressources ${updated ? 'mis à jour' : 'publié'} : ${message.url}`)]
            });
        } catch (err) {
            Client.log?.error?.(`[Ressources] /ressources : ${err.stack || err.message}`);
            await interaction.editReply({ embeds: [embed('Red', ':x: | Une erreur est survenue lors de la publication.')] });
        }
    }
};
