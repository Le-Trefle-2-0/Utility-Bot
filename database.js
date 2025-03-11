const sequelize = require('sequelize');

module.exports = async (Client) => {
    Client.db = new sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });

    Client.Questions = await Client.db.define('questions', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        question: {
            type: sequelize.STRING,
            allowNull: false
        },
        answer: {
            type: sequelize.STRING,
            allowNull: false
        },
        threadLink: {
            type: sequelize.STRING,
            allowNull: true
        }
    }).sync({ alter: true });

    Client.Tickets = await Client.db.define('tickets', {
        id: {
            type: sequelize.UUID,
            primaryKey: true,
            defaultValue: sequelize.UUIDV4
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false
        },
        channelID: {
            type: sequelize.STRING,
            allowNull: false
        },
        assignedRoleID: {
            type: sequelize.STRING,
            allowNull: false
        }
    }).sync({ alter: true });

    Client.Timeouts = await Client.db.define('timeouts', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        reason: {
            type: sequelize.STRING,
            allowNull: false
        },
        startTimestamp: {
            type: sequelize.INTEGER,
            allowNull: false
        },
        endTimestamp: {
            type: sequelize.INTEGER,
            allowNull: false
        }
    }).sync({ alter: true });

    Client.ModLogs = await Client.db.define('modlogs', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        moderatorID: {
            type: sequelize.STRING,
            allowNull: false
        },
        reason: {
            type: sequelize.STRING,
            allowNull: false
        },
        timestamp: {
            type: sequelize.INTEGER,
            allowNull: false
        },
        type: {
            type: sequelize.STRING,
            allowNull: false
        }
    }).sync({ alter: true });
}