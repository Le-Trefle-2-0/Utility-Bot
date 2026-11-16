const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { SERVER_WIDE } = require('../Utility/xpEvents');

const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Arrêter un évènement d\'XP doublée (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'salon', desc: 'Salon dont arrêter l\'évènement (évènement serveur si omis)', type: 'channel', required: false }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.options.getChannel('salon');
        const deleted = await Client.XpEvents.destroy({ where: { guildID: interaction.guild.id, channelID: channel?.id ?? SERVER_WIDE } });

        if (!deleted) {
            return interaction.reply({
                embeds: [errorEmbed(channel ? `Aucun évènement d'XP doublée n'est en cours dans ${channel}.` : 'Aucun évènement d\'XP doublée n\'est en cours sur tout le serveur.')],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.reply({
            embeds: [new EmbedBuilder().setColor('8cc088').setDescription(`🍀 | L'évènement d'XP doublée ${channel ? `dans ${channel}` : 'du serveur'} est terminé.`)]
        });
    }
};
