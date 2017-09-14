/* eslint-disable no-underscore-dangle */
const { Master } = require('./comunication');
const TaskQueue = require('./taskQueue');
const JsonSocket = require('json-socket');

const taskQueue = new TaskQueue();

JsonSocket.prototype.socketName = () => `${this._socket.remoteAddress}:${this._socket.remotePort}`;

const comunication = new Master();

function handleConnection(connectionToDecorate) {
  const connection = new JsonSocket(connectionToDecorate);
  console.log('Name', connection.socketName());

  taskQueue.on('newTask', (taskConnection, task) => {
    // console.log('1--', taskConnection);
    // console.log('2--', task);
    comunication
      .event('newTask', task)
      .send(taskConnection);
  });

  taskQueue.addConnection(connection);
  taskQueue.checkTasks();
  comunication.message('Hello from server').send(connection);

  function onConnectionData(d) {
    comunication.detect(d);
  }

  function onConnectionClose() {
    console.log('Del');
    taskQueue.removeConnection(connection);
  }

  function onConnectionError(err) {
    console.error('Connection %s error: %s', err.message);
  }

  connection.on('message', onConnectionData);
  connection.on('close', onConnectionClose);
  connection.on('error', onConnectionError);
}

module.exports = {
  handleConnection,
  addTask: (task) => {
    taskQueue.addTask(task);
  },
};
