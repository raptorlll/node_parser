let master = null;
function handleConnection(masterPort) {
    return function(connection) {
        let remoteAddress = connection.remoteAddress + ':' + connection.remotePort;
        console.log('Slave connected');


        connection.on('data', onConnectionData);
        connection.once('close', onConnectionClose);
        connection.on('error', onConnectionError);

        function onConnectionData(d) {
            console.log('connection data from %s: %j', remoteAddress, d);
            connection.write("!!"+ d);
        }

        function onConnectionClose() {

        }

        function onConnectionError(err) {
            console.log('Connection %s error: %s', remoteAddress, err.message);
        }
    }
};




module.exports = {
    handleConnection
};