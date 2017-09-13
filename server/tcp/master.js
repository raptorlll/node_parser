let {Master, Slave} = require('./comunication');
let connections = [];
let TaskQueue = require('./taskQueue');
let taskQueue = new TaskQueue();
let JsonSocket = require('json-socket');
JsonSocket.prototype.socketName = function () {
    return this._socket.remoteAddress + ':' + this._socket.remotePort;
};
let comunication = new Master();

function handleConnection(connection) {
    connection = new JsonSocket(connection);
    console.log("Name", connection.socketName());
    taskQueue.on('newTask', (connection, task) => {
        console.log("1--", connection);
        console.log("2--", task);
        comunication
            .event('newTask', task)
            .send(connection);
    });

    taskQueue.addConnection(connection);
    taskQueue.checkTasks();
    comunication.message('Hello from server').send(connection);

    connection.on('message', onConnectionData);
    connection.on('close', onConnectionClose);
    connection.on('error', onConnectionError);

    function onConnectionData(d) {
        comunication.detect(d);
    }

    function onConnectionClose() {
        console.log("Del");
        taskQueue.removeConnection(connection);
    }

    function onConnectionError(err) {
        // console.log('Connection %s error: %s', remoteAddress, err.message);
    }

    function startInfiniteCheck() {
        while (taskQueue.haveFreeTasks() && taskQueue.haveFreeConnection() && connections.length) {
            checkFreeTasks();
        }
    }
}


module.exports = {
    handleConnection,
    addTask: (task) => {
        taskQueue.addTask(task);
    }
};