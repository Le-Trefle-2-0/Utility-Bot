require('dotenv').config();
require('./Utility/StartCheck')();

const Client = require('./Bot').login();
Client.log = require('./Utility/console');
// Client.log.error('test error')