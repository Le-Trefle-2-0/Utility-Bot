const sequelize = require('sequelize');

module.exports = (Client) => {
    Client.db = new sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });

    Client.Tickets = Client.db.define('tickets', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user: {
            type: sequelize.STRING,
            allowNull: false
        },
        reason: {
            type: sequelize.STRING,
            allowNull: false
        },
        status: {
            type: sequelize.STRING,
            allowNull: false,
            defaultValue: 'pending'
        }
    });
} // �