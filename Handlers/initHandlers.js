module.exports = (Client) => {
    require('./buttons')(Client);
    require('./commands')(Client);
    require('./events')(Client);
    require('./menus')(Client);

    Client.log.info('Handlers have been initialized');
}