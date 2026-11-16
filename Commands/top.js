const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');

const PER_PAGE = 10;
const MAX_ENTRIES = 100;
const MEDALS = ['🥇', '🥈', '🥉'];

const fmt = (n) => n.toLocaleString('fr-FR');

function buildPage(guild, rows, pageIndex, totalPages) {
    const start = pageIndex * PER_PAGE;
    const lines = rows.slice(start, start + PER_PAGE).map((row, i) => {
        const place = start + i + 1;
        const rank = MEDALS[place - 1] ?? `**${place}.**`;
        return `${rank} <@${row.userID}> · Niveau **${row.level}** · ${fmt(row.xp)} XP`;
    });

    return new EmbedBuilder()
        .setColor('8cc088')
        .setTitle(`🍀 Classement de ${guild.name}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Page ${pageIndex + 1}/${totalPages}` });
}

module.exports = {
    description: 'Afficher le classement des membres les plus actifs',
    options: [],
    run: async (Client, interaction) => {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Cette commande est utilisable uniquement sur un serveur.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        try {
            const rows = await Client.Levels.findAll({
                where: { guildID: interaction.guild.id },
                order: [['xp', 'DESC']],
                limit: MAX_ENTRIES,
                raw: true
            });

            if (rows.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor('9bd2d2').setDescription('Personne n\'a encore gagné d\'XP sur ce serveur. Envoie un message pour ouvrir le bal ! 🍀')]
                });
            }

            const totalPages = Math.ceil(rows.length / PER_PAGE);
            const pages = Array.from({ length: totalPages }, (_, i) => buildPage(interaction.guild, rows, i, totalPages));

            if (totalPages === 1) return interaction.editReply({ embeds: [pages[0]] });

            // Boutons gérés par Buttons/previousPage.js et Buttons/nextPage.js
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previousPage').setLabel('Page précédente').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('nextPage').setLabel('Page suivante').setStyle(ButtonStyle.Secondary)
            );

            // Saut direct vers une page (Menus/pageSelect.js) ; Discord limite un menu à 25 options
            const select = new StringSelectMenuBuilder()
                .setCustomId('pageSelect')
                .setPlaceholder('Aller à la page…')
                .addOptions(pages.slice(0, 25).map((_, i) => {
                    const first = i * PER_PAGE + 1;
                    const last = Math.min((i + 1) * PER_PAGE, rows.length);
                    return { label: `Page ${i + 1}`, description: `Places ${first} à ${last}`, value: String(i) };
                }));

            const message = await interaction.editReply({ embeds: [pages[0]], components: [row, new ActionRowBuilder().addComponents(select)] });

            if (!Client.pages) Client.pages = {};
            Client.pages[message.id] = { pages, pageNumber: 0, requestedBy: interaction.user.id };

            // Expiration au bout de 5 minutes : on retire aussi les boutons devenus inutiles
            setTimeout(() => {
                delete Client.pages[message.id];
                interaction.editReply({ components: [] }).catch(() => null);
            }, 5 * 60 * 1000);
        } catch (err) {
            Client.log?.error?.(`[Niveaux] /top : ${err.stack || err.message}`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor('Red').setDescription(':x: | Impossible d\'afficher le classement pour le moment.')]
            });
        }
    }
};
