require('dotenv').config();
require('./Utility/StartCheck')();

const Client = require('./Bot').login();
Client.log = require('./Utility/console');

require('./Handlers/initHandlers')(Client);
require('./Utility/logging/botLifecycle')(Client);
require('./database')(Client).catch(error => {
    console.error('Database initialisation failed:', error);
    Client.failDb?.(error);
});
//require('./server');