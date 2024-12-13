module.exports = (Client) => {
    require('./buttons')(Client);
    require('./commands')(Client);
    require('./events')(Client);
    require('./menus')(Client);
    require('./contextMenus')(Client);
    require('./modals')(Client);

    Client.log.info('Handlers have been initialized');
}