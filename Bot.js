const { Client, Collection, Partials, GatewayIntentBits } = require('discord.js');
const { algoliasearch } = require('algoliasearch');

const client = new Client({ 
    // 131071 = toutes les intents sauf AutoMod, ajoutées pour journaliser les règles et les actions AutoMod
    intents: 131071 | GatewayIntentBits.AutoModerationConfiguration | GatewayIntentBits.AutoModerationExecution, 
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction, Partials.User, Partials.ThreadMember, Partials.GuildScheduledEvent] 
});

client.commands = new Collection();
client.buttons = new Collection();
client.menus = new Collection();
client.contextMenus = new Collection();
client.modals = new Collection();
// client.musicPlayer = require('./Utility/musicPlayer');
client.algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);

// Charger la configuration avec validation
const ticketsConfig = require('./config/ticketsConfig');
client.settings = require('./settings.json');
client.ticketsConfig = ticketsConfig;

module.exports.login = () => {
	client.login(process.env.SECRET_TOKEN);

	return client;
};