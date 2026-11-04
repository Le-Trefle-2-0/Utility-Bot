const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    description: 'Afficher les récompenses de niveau',
    options: [],
    run: async (Client, interaction) => {
        if (!interaction.guild) return;

        const rewards = await Client.LevelRewards.findAll({
            where: { guildID: interaction.guild.id },
            order: [['level', 'ASC']],
            raw: true
        });

        if (rewards.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('9bd2d2').setDescription('Aucune récompense de niveau n\'est configurée pour le moment.')],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('8cc088')
                    .setTitle('🎁 Récompenses de niveau')
                    .setDescription(rewards.map(r => `Niveau **${r.level}** → <@&${r.roleID}>`).join('\n'))
                    .setFooter({ text: 'Les rôles sont cumulatifs.' })
            ],
            flags: MessageFlags.Ephemeral
        });
    }
};
