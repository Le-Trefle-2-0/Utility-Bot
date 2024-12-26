const { Client, Collection } = require('discord.js');
const { algoliasearch } = require('algoliasearch');

const client = new Client({ intents: 131071 });

client.commands = new Collection();
client.buttons = new Collection();
client.menus = new Collection();
client.contextMenus = new Collection();
client.modals = new Collection();
// client.musicPlayer = require('./Utility/musicPlayer');
client.algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);

module.exports.login = () => {
	client.login(process.env.SECRET_TOKEN);

	return client;
};