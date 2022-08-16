const { Client } = require('discord.js');

const client = new Client({ intents: 131071 });

module.exports.login = () => {
	client.login(process.env.SECRET_TOKEN);

	return client;
};