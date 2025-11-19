const { EmbedBuilder, MessageFlags } = require('discord.js');

function formatDiscordTimestamp(ms) {
    const seconds = Math.floor(ms / 1000);
    return `<t:${seconds}:F> (<t:${seconds}:R>)`;
}

module.exports = {
    description: 'Afficher les informations d\'un rôle',
    options: [
        {
            name: 'role',
            description: 'Rôle dont afficher les informations',
            type: 'role',
            required: true
        }
    ],
    guilds: [process.env.MAIN_GUILD_ID],
    run: async (Client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const role = interaction.options.getRole('role');
            const guild = interaction.guild;

            // Ensure member cache is up to date for accurate counts
            await guild.members.fetch();

            const memberCount = guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;
            const createdAt = role.createdTimestamp ? formatDiscordTimestamp(role.createdTimestamp) : 'Inconnu';
            const position = typeof role.position === 'number' ? role.position : (role.rawPosition || 0);

            // Build a small image showing the position (using shields.io badge as thumbnail)
            const badgeColor = '2b2d31';
            const thumbnailUrl = `https://img.shields.io/badge/Position-${encodeURIComponent(String(position))}-${badgeColor}.svg`;

            // Determine embed color from role color (fallback if default/no color)
            const embedColor = role.color && role.color !== 0 ? role.color : '9bd2d2';

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`Informations du rôle: ${role.name}`)
                .setThumbnail(thumbnailUrl)
                .addFields(
                    { name: 'Nom', value: role.name || 'Inconnu', inline: true },
                    { name: 'Membres', value: String(memberCount), inline: true },
                    { name: 'Créé le', value: createdAt, inline: false },
                    { name: 'Position', value: String(position), inline: true },
                    { name: 'ID', value: role.id, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            Client.log?.error?.(e);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('db3226')
                        .setDescription(`:x: | Une erreur est survenue lors de la récupération des informations du rôle.`)
                ]
            });
        }
    }
};
