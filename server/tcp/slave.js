const { Slave } = require('./comunication');

function handleConnection() {
  const comunication = new Slave();
  comunication.message('Hello from client').send(this);
  comunication.on('newTask', (task) => {
    console.log('Received task', task);
  });

  this.on('message', (data) => {
    comunication.detect(data);
  });

  this.on('close', () => {
    console.log('Close');
  });

  this.on('error', (error) => {
    console.log('Connection error', error);
  });
}

module.exports = {
  handleConnection,
};
