const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsLogger = require('../Utility/ticketsLogger');

const error = (interaction, message) => interaction.editReply({
    embeds: [new EmbedBuilder().setColor('Red').setDescription(`:x: | ${message}`)]
});

module.exports = {
    description: 'Convoquer un membre dans un ticket',
    guilds: ['mainGuildID'],
    options: [
        {
            name: 'membre',
            desc: 'Membre à convoquer',
            type: 'user',
            required: true
        },
        {
            name: 'motif',
            desc: 'Raison de la convocation (visible par le membre)',
            type: 'string',
            required: true
        },
        {
            name: 'equipe',
            desc: 'Équipe en charge (uniquement si vous appartenez à plusieurs équipes)',
            type: 'string',
            required: false
        }
    ],
    run: async (Client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let ticketChannel;
        try {
            const member = interaction.options.getMember('membre');
            const reason = interaction.options.getString('motif').trim();
            const requestedTeam = interaction.options.getString('equipe')?.trim();

            // Équipes du staff qui convoque
            const staffTeams = ticketsConfig.getAllTeams()
                .filter(team => team.roleIDs.some(roleID => interaction.member.roles.cache.has(roleID)));

            if (!staffTeams.length) {
                return error(interaction, "Seuls les membres d'une équipe de tickets peuvent convoquer un membre.");
            }

            let team;
            if (requestedTeam) {
                team = staffTeams.find(t => t.name.toLowerCase() === requestedTeam.toLowerCase());
                if (!team) {
                    return error(interaction, `Vous n'appartenez pas à l'équipe « ${requestedTeam} ». Vos équipes : ${staffTeams.map(t => t.name).join(', ')}.`);
                }
            } else if (staffTeams.length === 1) {
                team = staffTeams[0];
            } else {
                return error(interaction, `Vous appartenez à plusieurs équipes, précisez l'option \`equipe\` : ${staffTeams.map(t => t.name).join(', ')}.`);
            }

            // Vérifications sur le membre convoqué
            if (!member) return error(interaction, 'Membre introuvable sur ce serveur.');
            if (member.user.bot) return error(interaction, 'Vous ne pouvez pas convoquer un bot.');
            if (member.id === interaction.user.id) return error(interaction, 'Vous ne pouvez pas vous convoquer vous-même.');
            if (!reason) return error(interaction, 'Merci d\'indiquer un motif.');

            const existingTicket = await Client.Tickets.findOne({ where: { userID: member.id } });
            if (existingTicket) {
                return error(interaction, `${member} a déjà un ticket ouvert : <#${existingTicket.channelID}>`);
            }

            // Rôles de l'équipe et catégorie
            const roleIDs = team.roleIDs.filter(roleID => interaction.guild.roles.cache.has(roleID));
            if (!roleIDs.length) throw new Error(`Aucun rôle de l'équipe ${team.name} n'existe sur Discord`);

            const categoryID = ticketsConfig.getCategoryID();
            if (!categoryID) throw new Error('Tickets category ID not configured');
            const parent = await interaction.guild.channels.fetch(categoryID).catch(() => null);
            if (!parent) throw new Error(`Tickets category ${categoryID} not found on Discord`);

            // Le ticket est d'emblée pris en charge par le staff : l'équipe peut lire sans écrire
            const permissions = [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                ...roleIDs.map(id => ({
                    id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                    deny: [PermissionsBitField.Flags.SendMessages]
                })),
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ];

            ticketChannel = await interaction.guild.channels.create({
                name: `convocation-${member.displayName}`,
                parent,
                permissionOverwrites: permissions
            });

            const ticket = await Client.Tickets.create({
                userID: member.id,
                channelID: ticketChannel.id,
                assignedTeam: team.name,
                summonedBy: interaction.user.id,
                takenBy: interaction.user.id,
                waitingSince: new Date()
            });

            ticketsLogger.logTicketSummon(ticket.id, interaction.user.id, member.id, team.name, ticketChannel.id);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('takeTicket').setLabel('Prendre en charge').setStyle(2).setDisabled(true),
                new ButtonBuilder().setCustomId('transferTicket').setLabel('Transférer').setStyle(2),
                new ButtonBuilder().setCustomId('closeTicket').setLabel('Fermer le ticket').setStyle(4)
            );

            const message = await ticketChannel.send({
                content: `<@${member.id}> - <@${interaction.user.id}>`,
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setTitle('Convocation')
                        .setDescription(`<@${interaction.user.id}> (équipe ${team.name}) souhaite échanger avec vous.\n\n**Motif :** ${reason.slice(0, 1000)}`)
                        .setTimestamp()
                ],
                components: [row],
                allowedMentions: { users: [member.id, interaction.user.id] }
            });
            await message.pin().catch(() => {});

            // Prévenir le membre en message privé (il peut les avoir fermés)
            const dmSent = await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setDescription(`Vous avez été convoqué par l'équipe ${team.name} de **${interaction.guild.name}** : <#${ticketChannel.id}>\n\n**Motif :** ${reason.slice(0, 1000)}`)
                ]
            }).then(() => true).catch(() => false);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setDescription(`:white_check_mark: | ${member} a été convoqué dans <#${ticketChannel.id}>.${dmSent ? '' : "\n:warning: | Ses messages privés sont fermés : il n'a été prévenu que par la mention dans le salon."}`)
                ]
            });
        } catch (err) {
            ticketsLogger.logError('summon', err);

            // Ne pas laisser de salon orphelin si la création du ticket a échoué
            if (ticketChannel && !(await Client.Tickets.findOne({ where: { channelID: ticketChannel.id } }).catch(() => null))) {
                await ticketChannel.delete().catch(() => {});
            }

            await error(interaction, `Erreur lors de la convocation : ${err.message}`).catch(() => {});
        }
    }
};
