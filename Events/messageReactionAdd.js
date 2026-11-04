const { handleClaim } = require('../Utility/collect');

module.exports = (Client, reaction, user) => {
    handleClaim(Client, reaction, user).catch(err => Client.log?.error?.(`[Collecte] ${err.stack || err.message}`));
};
