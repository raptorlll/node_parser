/* eslint-disable no-underscore-dangle */
/**
 * node server/tcp/server.js -m -p 9000
 * node server/tcp/server.js -s -p 9000
 */
require('../config');
const net = require('net');
const program = require('commander');
const master = require('./master');
const slave = require('./slave');
const { getMainPageLinks } = require('../linksParser');
const JsonSocket = require('json-socket');

JsonSocket.prototype.socketName = function socketName() {
  return `${this._socket.remoteAddress}:${this._socket.remotePort}`;
};

program
  .version('0.0.1')
  .option('-m, --master', 'is this master server(with db connection)', false)
  .option('-s, --slave', 'is this server slave', false)
  .option('-p, --port <port>', 'port to master init or to connecting to master', 9000)
  .option('-l, --limit <limit>', 'urls limit', 50)
  .option('-u, --url <url>', 'url to parse (root url)', 'https://news.tut.by/')
  .parse(process.argv);

function initializeMaster() {
  const server = net.createServer();
  console.log('Init master');
  server.on('connection', master.handleConnection(program.url, program.limit));

  getMainPageLinks(program.url, program.limit)
    .then(linksCollection =>
      /**
       * map in order to pass down to next then in sync way
       */
      linksCollection.map((index, link) => {
        // console.log(link);
        master.addTask(link);
        return link;
      }))
    .then(() => {
      server.listen(program.port, () => {
        console.log('Master server listening to %j', server.address());
      });
    })
    .catch((error) => {
      console.log('Error', error.message);
    });
}

function initializeSlave() {
  const client = new JsonSocket(new net.Socket());
  slave.handleConnection = slave.handleConnection.bind(client);
  client.connect(program.port, '127.0.0.1', slave.handleConnection);
}

/**
 * Init master
 */
if (program.master) {
  initializeMaster();
} else if (program.slave) {
  initializeSlave();
}

