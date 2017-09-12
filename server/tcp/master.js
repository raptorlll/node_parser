let connections = [];
let tasks = [];

function addTask(task) {
    console.log('Added task', task);
    tasks.push(task);
}

function removeTask(task) {
    console.log('Remove task', task);
    delete tasks[tasks.indexOf(task)];
}


function addConnection(key) {
    console.log('new client connection from %s', key);
    connections.push(key);
}

function removeConnection(key) {
    console.log('connection from %s closed', remoteAddress);
    delete connections[connections.indexOf(key)];
}

function addToWorkers() {
    for (let i = 0; i< connections.length; i++){
        let connection = connections[i];
        connection.split(':');
        /**
         * ???????
         */
    }
}

function handleConnection(connection) {
    let remoteAddress = connection.remoteAddress + ':' + connection.remotePort;
    addConnection(remoteAddress);
    addToWorkers();
    connection.on('data', onConnectionData);
    connection.once('close', onConnectionClose);
    connection.on('error', onConnectionError);

    function onConnectionData(d) {
        console.log('connection data from %s: %j', remoteAddress, d);
        connection.write("!!"+ d);
    }

    function onConnectionClose() {
        removeConnection(remoteAddress);
    }

    function onConnectionError(err) {
        console.log('Connection %s error: %s', remoteAddress, err.message);
    }
}



module.exports = {
    handleConnection,
    addTask
};