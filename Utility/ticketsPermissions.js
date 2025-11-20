/**
 * Utilitaires pour gérer les permissions des tickets
 */

const { PermissionsBitField } = require('discord.js');

/**
 * Crée les overrides de permissions pour un nouveau ticket
 * @param {string} userID - ID de l'utilisateur qui ouvre le ticket
 * @param {string} guildID - ID du serveur
 * @param {string} roleID - ID du rôle assigné
 * @returns {Array} Array d'objets permission override
 */
const createTicketPermissions = (userID, guildID, roleID) => {
    return [
        {
            id: userID,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ]
        },
        {
            id: guildID,
            deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
            id: roleID,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory
            ],
            deny: [PermissionsBitField.Flags.SendMessages]
        }
    ];
};

/**
 * Ajoute les permissions à un staff membre qui prend en charge
 * @param {Channel} channel - Le canal du ticket
 * @param {GuildMember} member - Le staff member
 */
const addStaffPermissions = async (channel, member) => {
    try {
        await channel.permissionOverwrites.edit(member, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
    } catch (error) {
        throw new Error(`Failed to add staff permissions: ${error.message}`);
    }
};

/**
 * Retire les permissions d'envoi du rôle assigné
 * @param {Channel} channel - Le canal du ticket
 * @param {Role} role - Le rôle à modifier
 */
const removeRoleSendPermissions = async (channel, role) => {
    try {
        await channel.permissionOverwrites.edit(role, {
            SendMessages: false
        });
    } catch (error) {
        throw new Error(`Failed to remove role send permissions: ${error.message}`);
    }
};

/**
 * Met à jour les permissions lors d'un transfert
 * @param {Channel} channel - Le canal du ticket
 * @param {Role} oldRole - L'ancien rôle
 * @param {Role} newRole - Le nouveau rôle
 */
const transferTicketPermissions = async (channel, oldRole, newRole) => {
    try {
        // Supprimer l'ancien rôle
        await channel.permissionOverwrites.delete(oldRole);

        await channel.permissionOverwrites.edit(newRole, {
            ViewChannel: true,
            ReadMessageHistory: true,
            SendMessages: false
        });
    } catch (error) {
        throw new Error(`Failed to transfer ticket permissions: ${error.message}`);
    }
};

module.exports = {
    createTicketPermissions,
    addStaffPermissions,
    removeRoleSendPermissions,
    transferTicketPermissions
};
