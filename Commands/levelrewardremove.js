const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Supprimer la récompense d\'un niveau (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'niveau', desc: 'Niveau dont supprimer la récompense', type: 'int', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const level = interaction.options.getInteger('niveau');
        const reward = await Client.LevelRewards.findOne({ where: { guildID: interaction.guild.id, level } });
        if (!reward) {
            return interaction.reply({ embeds: [errorEmbed(`Aucune récompense n'est définie pour le niveau ${level}.`)], flags: MessageFlags.Ephemeral });
        }

        await reward.destroy();
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('8cc088')
                    .setDescription(`🍀 | Récompense du niveau **${level}** (<@&${reward.roleID}>) supprimée. Les membres qui ont déjà ce rôle le conservent.`)
            ],
            flags: MessageFlags.Ephemeral
        });
    }
};
