const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { syncGuildRewards } = require('../Utility/levelRewards');

const MAX_LEVEL = 1000;
const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Définir le rôle offert en atteignant un niveau (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'niveau', desc: 'Niveau à atteindre', type: 'int', required: true },
        { name: 'role', desc: 'Rôle à offrir', type: 'role', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const level = interaction.options.getInteger('niveau');
        const role = interaction.options.getRole('role');
        const guild = interaction.guild;

        if (level < 1 || level > MAX_LEVEL) {
            return interaction.reply({ embeds: [errorEmbed(`Le niveau doit être compris entre 1 et ${MAX_LEVEL}.`)], flags: MessageFlags.Ephemeral });
        }
        if (role.id === guild.id || role.managed) {
            return interaction.reply({ embeds: [errorEmbed('Ce rôle ne peut pas être attribué (rôle @everyone ou géré par une intégration).')], flags: MessageFlags.Ephemeral });
        }
        if (role.comparePositionTo(guild.members.me.roles.highest) >= 0) {
            return interaction.reply({ embeds: [errorEmbed(`Je ne peux pas attribuer ${role} : il est placé au-dessus (ou au même niveau que) mon rôle le plus élevé.`)], flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const previous = await Client.LevelRewards.findOne({ where: { guildID: guild.id, level } });
            await Client.LevelRewards.upsert({ guildID: guild.id, level, roleID: role.id });

            // Les membres ayant déjà atteint ce niveau reçoivent le rôle tout de suite
            const { members, roles } = await syncGuildRewards(Client, guild);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('8cc088')
                        .setTitle('🍀 Récompense enregistrée')
                        .setDescription([
                            `Niveau **${level}** → ${role}`,
                            previous && previous.roleID !== role.id ? `*(remplace <@&${previous.roleID}>, que les membres déjà récompensés conservent)*` : null,
                            `${roles} rôle(s) attribué(s) à ${members} membre(s) ayant déjà atteint ce niveau.`
                        ].filter(Boolean).join('\n'))
                ]
            });
        } catch (err) {
            Client.log?.error?.(`[Niveaux] /levelreward : ${err.stack || err.message}`);
            await interaction.editReply({ embeds: [errorEmbed('Une erreur est survenue lors de l\'enregistrement.')] });
        }
    }
};
