let net = require('net');
const program = require('commander');
const master = require('./master');
const slave = require('./slave');
const {getMainPageLinks, getInnerPagesData} = require('../linksParser');
let JsonSocket = require('json-socket');
JsonSocket.prototype.socketName = function () {
    return this._socket.remoteAddress + ':' + this._socket.remotePort;
};

/**
 * (бонусное) Реализовать скрипт-парсер из
 * (1) в виде сервера и клиентов. Клиенты
 * подключаются к серверу через TCP сокет,
 * получают от него необходимые им параметры,
 * парсят новости и отсылают результаты серверу,
 * который сохраняет результаты в БД (БД одна и
 * с ней взаимодействует только сервер). Сам сервер
 * также может парсить новости. Т.е. скрипт может
 * работать как в режиме клиента, так и в режиме
 * сервера в зависимости от переданных аргументов.
 * Предусмотреть борьбу с условиями состязаний (гонками) -
 * чтобы одна и та же новость не парсилась двумя и
 * более клиентами и в
 * БД не появлялись дубликаты новостей.
 */
program
    .version('0.0.1')
    .option('-m, --master', 'is this master server(with db connection)', false)
    .option('-s, --slave', 'is this server slave', false)
    .option('-p, --port <port>', 'port to master init or to connecting to master', 9000)
    // .option('-i, --masterport <masterport>', 'master port', Math.ceil(Math.random()*1000))
    .option('-l, --limit <limit>', 'urls limit', 50)
    .option('-u, --url <url>', 'url to parse (root url)', 'https://news.tut.by/')
    .parse(process.argv);

function initializeMaster() {
    let server = net.createServer();
    console.log('Init master');
    server.on('connection', master.handleConnection);

    getMainPageLinks(program.url, program.limit)
        .then((linksCollection) => {
            /**
             * map in order to pass down to next then in sync way
             */
            return linksCollection.map((index, link) => {
                // console.log(link);
                master.addTask(link);
                return link;
            });
        })
        .then((linksArray) => {
            server.listen(program.port, function () {
                console.log('Master server listening to %j', server.address());
            })
        })
        .catch((error) => {
            console.log('Error', error);
        });
}
function initializeSlave() {
    let client = new JsonSocket(new net.Socket());

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

