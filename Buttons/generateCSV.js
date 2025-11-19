const { AttachmentBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = async (Client, interaction) => {
    try {
        if (!Client.pages) return interaction.reply({
            embeds: [new EmbedBuilder().setColor('db3226').setDescription(':x: | Ce générateur a expiré, merci de recommencer.')],
            flags: MessageFlags.Ephemeral
        });

        const pager = Client.pages[interaction.message.id];
        if (!pager) return interaction.reply({
            embeds: [new EmbedBuilder().setColor('db3226').setDescription(':x: | Ce générateur a expiré, merci de recommencer.')],
            flags: MessageFlags.Ephemeral
        });

        // Optional: restrict to requester
        if (pager.requestedBy && pager.requestedBy !== interaction.user.id) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('db3226').setDescription(':x: | Seule la personne qui a lancé la commande peut générer le CSV.')],
                flags: MessageFlags.Ephemeral
            });
        }

        const rows = pager.dataset || [];
        const header = 'discord_id,username\n';
        const csvBody = rows.map(r => `${r.id},${(r.username || '').replaceAll('"', '""')}`).join('\n');
        const csv = header + csvBody + '\n';

        const buffer = Buffer.from(csv, 'utf8');
        const fileName = `users_role_${pager.roleId || 'list'}.csv`;
        const attachment = new AttachmentBuilder(buffer, { name: fileName });

        return interaction.reply({ files: [attachment], flags: MessageFlags.Ephemeral });
    } catch (e) {
        Client.log?.error?.(e);
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('db3226').setDescription(':x: | Erreur lors de la génération du CSV.')],
            flags: MessageFlags.Ephemeral
        });
    }
};