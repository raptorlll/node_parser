let master = null;
let {Master, Slave} = require('./comunication');


function handleConnection() {
    let comunication = new Slave();
    comunication.message('Hello from client').send(this);

    comunication.on('newTask', (task)=>{
        console.log('Received task', task);

    });
    this.on('message', function (data) {
        comunication.detect(data);
    });

    this.on('close', function () {
        console.log('Close');
    });

    this.on('error', (error) => {
        console.log('Connection error', error);
    });
};


module.exports = {
    handleConnection
};