let net = require('net');
const program = require('commander');
const master = require('./master');
const slave = require('./slave');

const {getMainPageLinks, getInnerPagesData} = require('../linksParser');
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
    .option('-m, --master', 'is this master server(with db connection)')
    .option('-s, --slave', 'is this server slave')
    .option('-p, --port <port>', 'self port', Math.ceil(Math.random()*1000))
    .option('-mp, --masterport <masterport>', 'master port', Math.ceil(Math.random()*1000))
    .option('-l, --limit <limit>', 'urls limit', 50)
    .option('-u, --url <url>', 'url to parse (root url)', 'https://news.tut.by/')
    .parse(process.argv);

function initializeMaster() {
    let server = net.createServer();
    server.on('connection', master.handleConnection);
    console.log('connect');
    getMainPageLinks(program.url, program.limit)
        .then((linksCollection) => {
            /**
             * map in order to pass down to next then in sync way
             */
            return linksCollection.map((index, link) => {
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
    let client = new net.Socket();
    client.connect(program.port, '127.0.0.1', function() {
        console.log('Connected');
        client.write('Hello, server! Love, Client.');
    });

    client.on('data', function(data) {
        console.log('Received: ' + data);
        // client.destroy();
    });

    client.on('close', function() {
        console.log('Connection closed');
    });

    client.on('error', (error)=>{
        console.log('Connection error', error);
    });

}
/**
 * Init master
 */
console.log(program);
// console.log(program.master);
//
// process.exit(0);
if(program.master !== undefined && program.master){
    initializeMaster();
}else if(program.slave !== undefined && program.slave){
    initializeSlave();
}

