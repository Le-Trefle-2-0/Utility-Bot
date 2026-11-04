const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const axios = require('axios');
const { levelFromXp } = require('../Utility/levels');
const { syncGuildRewards } = require('../Utility/levelRewards');

const API = 'https://api.draftbot.fr/activities/levels';
const MAX_PAGES = 500;      // garde-fou
const PAGE_DELAY_MS = 300;  // on ménage l'API de DraftBot

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Récupère le classement complet de DraftBot (API publique, paginée). */
async function fetchDraftBotLeaderboard(guildID) {
    const users = [];
    let totalPages = 1;

    for (let page = 0; page < Math.min(totalPages, MAX_PAGES); page++) {
        let data;
        for (let attempt = 1; ; attempt++) {
            try {
                ({ data } = await axios.get(`${API}/${guildID}`, { params: { page }, timeout: 15000 }));
                break;
            } catch (err) {
                if (attempt >= 3 || err.response?.status === 404) throw err;
                await sleep(1000 * attempt);
            }
        }

        if (page === 0) totalPages = Number(data.total) || 1;
        if (!Array.isArray(data.users) || data.users.length === 0) break;

        for (const u of data.users) users.push({ id: u.id, xp: Number(u.totalXp) || 0 });
        await sleep(PAGE_DELAY_MS);
    }

    return users;
}

const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Importer l\'XP du classement DraftBot (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        {
            name: 'inclure_partis',
            desc: 'Importer aussi les membres qui ont quitté le serveur (non par défaut)',
            type: 'boolean',
            required: false
        }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const includeLeft = interaction.options.getBoolean('inclure_partis') ?? false;
        const guild = interaction.guild;

        try {
            let leaderboard;
            try {
                leaderboard = await fetchDraftBotLeaderboard(guild.id);
            } catch (err) {
                Client.log?.error?.(`[Niveaux] Import DraftBot : ${err.message}`);
                const notFound = err.response?.status === 404;
                return interaction.editReply({
                    embeds: [errorEmbed(notFound
                        ? 'Aucun classement DraftBot public n\'a été trouvé pour ce serveur.'
                        : 'Impossible de récupérer le classement DraftBot pour le moment, réessaie plus tard.')]
                });
            }

            if (leaderboard.length === 0) {
                return interaction.editReply({ embeds: [errorEmbed('Le classement DraftBot est vide.')] });
            }

            let candidates = leaderboard.filter(u => u.xp > 0);
            let skippedLeft = 0;
            if (!includeLeft) {
                await guild.members.fetch();
                const before = candidates.length;
                candidates = candidates.filter(u => guild.members.cache.has(u.id));
                skippedLeft = before - candidates.length;
            }

            // On ne diminue jamais l'XP existante : relancer l'import est sans danger
            const existing = await Client.Levels.findAll({ where: { guildID: guild.id }, raw: true });
            const currentXp = new Map(existing.map(r => [r.userID, r.xp]));

            let created = 0, updated = 0, unchanged = 0;
            const rows = [];
            for (const u of candidates) {
                const current = currentXp.get(u.id);
                if (current !== undefined && current >= u.xp) { unchanged++; continue; }
                if (current === undefined) created++; else updated++;
                rows.push({ userID: u.id, guildID: guild.id, xp: u.xp, level: levelFromXp(u.xp) });
            }

            await Client.Levels.bulkCreate(rows, { updateOnDuplicate: ['xp', 'level'] });

            // Les membres importés reçoivent les rôles de récompense correspondant à leur niveau
            const rewardSync = await syncGuildRewards(Client, guild);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('8cc088')
                        .setTitle('🍀 Import DraftBot terminé')
                        .setDescription([
                            `**${created}** membre(s) ajouté(s)`,
                            `**${updated}** membre(s) mis à jour (XP DraftBot supérieure à l'actuelle)`,
                            `**${unchanged}** membre(s) inchangé(s) (XP actuelle déjà égale ou supérieure)`,
                            rewardSync.roles ? `🎁 **${rewardSync.roles}** rôle(s) de récompense attribué(s) à **${rewardSync.members}** membre(s)` : null,
                            includeLeft ? null : `**${skippedLeft}** membre(s) ayant quitté le serveur ignoré(s)`
                        ].filter(Boolean).join('\n'))
                        .setFooter({ text: `${leaderboard.length} membres dans le classement DraftBot` })
                ]
            });
        } catch (err) {
            Client.log?.error?.(`[Niveaux] Import DraftBot : ${err.stack || err.message}`);
            await interaction.editReply({ embeds: [errorEmbed('Une erreur est survenue pendant l\'import.')] });
        }
    }
};
