const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

function makePageEmbed(role, pageRows, pageIndex, totalPages, totalCount) {
    const ids = pageRows.map(m => m.id).join('\n') || '\u200b';
    const usernames = pageRows.map(m => m.user?.username || 'Unknown').join('\n') || '\u200b';

    return new EmbedBuilder()
        .setColor('9bd2d2')
        .setTitle(`Membres avec le rôle: ${role.name}`)
        .addFields(
            { name: 'Discord ID', value: ids, inline: true },
            { name: 'Username', value: usernames, inline: true }
        )
        .setFooter({ text: `Page ${pageIndex + 1}/${totalPages} • Total: ${totalCount}` })
        .setTimestamp();
}

module.exports = {
    description: 'Lister les utilisateurs ayant un rôle donné',
    options: [
        {
            name: 'role',
            description: 'Rôle à lister',
            type: 'role',
            required: true
        },
        {
            name: 'taille',
            description: 'Taille de page (par défaut 20, min 5, max 50)',
            type: 'int',
            required: false
        }
    ],
    guilds: [process.env.MAIN_GUILD_ID],
    run: async (Client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const role = interaction.options.getRole('role');
        let pageSize = interaction.options.getInteger('taille') || 20;
        if (pageSize < 5) pageSize = 5; if (pageSize > 50) pageSize = 50;

        try {
            const guild = interaction.guild;
            // Ensure full cache to not miss members
            await guild.members.fetch();

            // Collect members with the role
            const members = guild.members.cache.filter(m => m.roles.cache.has(role.id));
            const membersArr = Array.from(members.values())
                .sort((a, b) => (a.user?.username || '').localeCompare(b.user?.username || ''));

            if (membersArr.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('db3226')
                            .setDescription(`:x: | Aucun membre trouvé avec le rôle ${role}.`)
                    ]
                });
            }

            const chunks = chunkArray(membersArr, pageSize);
            const embeds = chunks.map((chunk, idx) => makePageEmbed(role, chunk, idx, chunks.length, membersArr.length));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previousPage').setLabel('Page précédente').setStyle('2'),
                new ButtonBuilder().setCustomId('nextPage').setLabel('Page suivante').setStyle('2'),
                new ButtonBuilder().setCustomId('generateCSV').setLabel('Générer CSV').setStyle('1')
            );

            // Send first page
            await interaction.editReply({ embeds: [embeds[0]], components: [row] });
            const message = await interaction.fetchReply();

            if (!Client.pages) Client.pages = {};
            Client.pages[message.id] = {
                pages: embeds,
                pageNumber: 0,
                // store dataset for CSV regeneration
                dataset: membersArr.map(m => ({ id: m.id, username: m.user?.username || 'Unknown' })),
                roleId: role.id,
                requestedBy: interaction.user.id
            };

            // Auto-expire after 5 minutes
            setTimeout(() => {
                delete Client.pages[message.id];
            }, 300000);
        } catch (e) {
            Client.log?.error?.(e);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('db3226')
                        .setDescription(`:x: | Une erreur est survenue lors de la récupération des membres.`)
                ]
            });
        }
    }
};