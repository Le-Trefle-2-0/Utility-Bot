const sequelize = require('sequelize');
const {EmbedBuilder} = require("discord.js");
const {scheduleJob} = require("node-schedule");
const {Op} = require("sequelize");
const ms = require("ms");

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
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        channelID: {
            type: sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        assignedTeam: {
            type: sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        createdAt: {
            type: sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.NOW
        },
        closedAt: {
            type: sequelize.DATE,
            allowNull: true
        },
        closedBy: {
            type: sequelize.STRING,
            allowNull: true
        }
    }, {
        indexes: [
            { fields: ['userID'] },
            { fields: ['assignedTeam'] },
            { fields: ['createdAt'] }
        ]
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



    let timeouts = await Client.Timeouts.findAll();
    for (let timeout of timeouts) {
        let member = await Client.guilds.cache.get(timeout.guildID).members.fetch(timeout.userID);
        if (member) {
            if (timeout.endTimestamp < Date.now()) {
                for (let role of Object.keys(Client.settings.toClose.roles)) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = member.guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    channel.permissionOverwrites.delete(member);
                                    break;

                                case 2:
                                    channel.permissionOverwrites.delete(member);
                                    break;
                            }
                        }
                    }
                }

                member.user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('9bd2d2')
                            .setTitle('Exclusion temporaire')
                            .setDescription(`Votre exclusion temporaire du serveur **${member.guild.name}** a pris fin.`)
                            .setAuthor({
                                name: member.guild.name,
                                iconURL: member.guild.iconURL({ dynamic: true })
                            })
                    ]
                });

                Client.Timeouts.destroy({ where: { userId: timeout.userID, guildId: timeout.guildID } });
                continue;
            }
            let duration = timeout.endTimestamp - Date.now();
            scheduleJob(new Date(Date.now() + duration), () => {
                for (let role of Object.keys(Client.settings.toClose.roles)) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = member.guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    channel.permissionOverwrites.delete(member);
                                    break;

                                case 2:
                                    channel.permissionOverwrites.delete(member);
                                    break;
                            }
                        }
                    }
                }
                member.user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('9bd2d2')
                            .setTitle('Exclusion temporaire')
                            .setDescription(`Votre exclusion temporaire du serveur **${member.guild.name}** a pris fin.`)
                            .setAuthor({
                                name: member.guild.name,
                                iconURL: member.guild.iconURL({ dynamic: true })
                            })
                    ]
                });
                Client.Timeouts.destroy({ where: { userId: timeout.userID, guildId: timeout.guildID } });
            });
        }
    }

    let softbans = await Client.ModLogs.findAll({
        where: {
            type: {
                [Op.startsWith]: 'Softban'
            }
        }
    });

    for (let softban of softbans) {
        let member = await Client.guilds.cache.get(softban.guildID).members.fetch(softban.userID);
        if (member) {
            let memberSoftbans = await Client.ModLogs.findAll({
                where: {
                    userID: softban.userID,
                    guildID: softban.guildID,
                    type: {
                        [Op.startsWith]: 'Softban'
                    }
                }
            });

            let softbanCount = memberSoftbans.length;
            let isLatest = true;
            // check if the softban is the latests
            for (let memberSoftban of memberSoftbans) {
                if (memberSoftban.timestamp > softban.timestamp) {
                    isLatest = false;
                }
            }

            if (isLatest) {
                let durations = ['7d', '30d', '365d', '36500d'];
                let newDuration = durations[softbanCount];
                for (let role of Object.keys(Client.settings.toClose.roles)) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = member.guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                        channel.permissionOverwrites.delete(member);
                                    });
                                    break;

                                case 2:
                                    scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                        channel.permissionOverwrites.delete(member);
                                    });
                                    break;
                            }
                        }
                    }
                }
                scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                    member.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('9bd2d2')
                                .setTitle('Softban')
                                .setDescription(`Votre softban du serveur **${member.guild.name}** s'est terminé.`)
                                .setAuthor({
                                    name: member.guild.name,
                                    iconURL: member.guild.iconURL({ dynamic: true })
                                })
                        ]
                    });
                });
            }
        }
    }
}