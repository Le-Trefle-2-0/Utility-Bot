import { Client, Collection } from 'discord.js';
import dotenv from 'dotenv'
import { algoliasearch } from "algoliasearch";
import errors from "./errors.json"

dotenv.config();
type Bot = Client & {
    commands: Collection<any, any>;
    buttons: Collection<any, any>;
    menus: Collection<any, any>;
    contextMenus: Collection<any, any>;
    modals: Collection<any, any>;
};

const client = new Client({ intents: 131071 });
let bot: Bot = client
client.commands = new Collection();
client.buttons = new Collection();
client.menus = new Collection();
client.contextMenus = new Collection();
client.modals = new Collection();
client.errors = errors;

if (!process.env.ALGOLIA_APP_ID) {
    const error = errors[1][0];
    throw new Error(`[${error.code}] - ${error.message}`);
}
if (!process.env.ALGOLIA_ADMIN_KEY) {
    const error = errors[1][1];
    throw new Error(`[${error.code}] - ${error.message}`);
}
client.algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);
client.settings = require('./settings.json');

export default client;