require('dotenv').config();
require('./Utility/StartCheck')();

const Client = require('./Bot').login();
Client.log = require('./Utility/console');

require('./Handlers/initHandlers')(Client);
require('./database')(Client);
require('./server');