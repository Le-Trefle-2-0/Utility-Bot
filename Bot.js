const { Client, Collection } = require('discord.js');

const client = new Client({ intents: 131071 });

client.commands = new Collection();
client.buttons = new Collection();
client.menus = new Collection();
client.contextMenus = new Collection();
client.musicPlayer = require('./Utility/musicPlayer');

module.exports.login = () => {
	client.login(process.env.SECRET_TOKEN);

	return client;
};