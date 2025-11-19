/**
 * Configuration centralisée pour le système de tickets
 * Avec validation et fallbacks
 */

const fs = require('fs');
const path = require('path');

// Schéma de validation des équipes
const validateTeam = (team, index) => {
    if (!team.name || typeof team.name !== 'string') {
        throw new Error(`Invalid team[${index}]: name must be a non-empty string, got: ${team.name}`);
    }
    if (!Array.isArray(team.roleIDs) || team.roleIDs.length === 0) {
        throw new Error(`Invalid team[${index}]: roleIDs must be a non-empty array, got: ${team.roleIDs}`);
    }
    team.roleIDs.forEach((roleID, roleIndex) => {
        if (!roleID || typeof roleID !== 'string') {
            throw new Error(`Invalid team[${index}].roleIDs[${roleIndex}]: must be a non-empty string, got: ${roleID}`);
        }
    });
    return true;
};

// Configuration par défaut
const defaultConfig = {
    tickets: {
        categoryID: null,
        teams: [],
        transcriptChannelID: null
    },
    logging: {
        enabled: true,
        level: 'info'
    }
};

// Charger la configuration depuis settings.json
const loadConfig = () => {
    const settingsPath = path.join(__dirname, '../settings.json');

    try {
        if (fs.existsSync(settingsPath)) {
            const fileContent = fs.readFileSync(settingsPath, 'utf-8');
            const userConfig = JSON.parse(fileContent);

            // Fusionner avec les valeurs par défaut
            return {
                ...defaultConfig,
                ...userConfig,
                tickets: {
                    ...defaultConfig.tickets,
                    ...(userConfig.tickets || {})
                }
            };
        } else {
            console.warn('[CONFIG] settings.json not found, using defaults');
            return defaultConfig;
        }
    } catch (error) {
        console.error('[CONFIG] Error loading settings.json:', error.message);
        return defaultConfig;
    }
};

// Valider la configuration
const validateConfig = (config) => {
    const errors = [];

    // Valider categoryID
    if (!config.tickets.categoryID) {
        errors.push('tickets.categoryID is required');
    }

    // Valider les équipes
    if (!Array.isArray(config.tickets.teams)) {
        errors.push('tickets.teams must be an array');
    } else if (config.tickets.teams.length === 0) {
        errors.push('tickets.teams must have at least one team');
    } else {
        config.tickets.teams.forEach((team, index) => {
            try {
                validateTeam(team, index);
            } catch (error) {
                errors.push(`tickets.teams: ${error.message}`);
            }
        });
    }

    // Valider transcriptChannelID
    if (!config.tickets.transcriptChannelID) {
        errors.push('tickets.transcriptChannelID is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Initialiser et exporter la configuration
let config = loadConfig();
const validation = validateConfig(config);

if (!validation.isValid) {
    console.warn('[CONFIG] Configuration issues detected:');
    validation.errors.forEach(error => {
        console.warn(`  - ${error}`);
    });
}

// Utilitaires
const getConfig = () => config;

const getTicketsConfig = () => config.tickets;

const getTeamByRoleID = (roleID) => {
    return config.tickets.teams.find(team => team.roleIDs.includes(roleID));
};

const getAllTeams = () => config.tickets.teams;

const getCategoryID = () => config.tickets.categoryID;

const getTranscriptChannelID = () => config.tickets.transcriptChannelID;

const isConfigValid = () => validation.isValid;

/**
 * Vérifie si un utilisateur a au moins un des rôles requis pour une équipe
 */
const userHasTeamRole = (member, teamName) => {
    const team = config.tickets.teams.find(t => t.name === teamName);
    if (!team) return false;
    return team.roleIDs.some(roleID => member.roles.cache.has(roleID));
};

/**
 * Récupère tous les rôles d'une équipe
 */
const getTeamRoles = (teamName) => {
    const team = config.tickets.teams.find(t => t.name === teamName);
    return team ? team.roleIDs : [];
};

module.exports = {
    getConfig,
    getTicketsConfig,
    getTeamByRoleID,
    getAllTeams,
    getCategoryID,
    getTranscriptChannelID,
    isConfigValid,
    validateConfig,
    userHasTeamRole,
    getTeamRoles
};
