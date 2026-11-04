const { AttachmentBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { progressFromXp, getPlace } = require('../Utility/levels');
const { renderRankCard } = require('../Utility/rankCard');

module.exports = {
    description: 'Afficher ton niveau et ta progression (ou ceux d\'un autre membre)',
    options: [
        {
            name: 'membre',
            desc: 'Membre dont afficher le niveau (toi par défaut)',
            type: 'user',
            required: false
        }
    ],
    run: async (Client, interaction) => {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Cette commande est utilisable uniquement sur un serveur.', flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('membre') ?? interaction.user;
        if (user.bot) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('Red').setDescription(':x: | Les bots n\'ont pas de niveau.')],
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const row = await Client.Levels.findOne({ where: { userID: user.id, guildID: interaction.guild.id } });
            const xp = row?.xp ?? 0;

            const progress = progressFromXp(xp);
            const place = await getPlace(Client, interaction.guild.id, xp);

            const image = await renderRankCard({
                displayName: member?.displayName ?? user.globalName ?? user.username,
                avatarURL: (member ?? user).displayAvatarURL({ extension: 'png', size: 256 }),
                level: progress.level,
                current: progress.current,
                needed: progress.needed,
                ratio: progress.ratio,
                place
            });

            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor('8cc088').setImage('attachment://rank.png')],
                files: [new AttachmentBuilder(image, { name: 'rank.png' })]
            });
        } catch (err) {
            Client.log?.error?.(`[Niveaux] /rank : ${err.stack || err.message}`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor('Red').setDescription(':x: | Impossible de générer ta carte de niveau pour le moment.')]
            });
        }
    }
};
