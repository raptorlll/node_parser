/* eslint-disable no-underscore-dangle */
const Constants = require('./taskConstants');
const { Master } = require('./comunication');
const TaskQueue = require('./taskQueue');
const JsonSocket = require('json-socket');
const mongoUtil = require('../mongoUtil');

mongoUtil.connectToServer();
const taskQueue = new TaskQueue();

JsonSocket.prototype.socketName = function socketName() {
  return `${this._socket.remoteAddress}:${this._socket.remotePort}`;
};

const comunication = new Master();

function convertObjectForMongo(obj) {
  const mongoObject = Object.assign({}, obj);
  mongoObject.date = new Date(obj);
  return mongoObject;
}

let links = 0;

function handleConnection(parentUrl, limit) {
  return function handleConnectionInner(connectionToDecorate) {
    const connection = new JsonSocket(connectionToDecorate);
    console.log('Name', connection.socketName());

    taskQueue.on('newTask', (taskConnection, task) => {
      // console.log(taskQueue.getTasksDebug());
      comunication
        .event(Constants.NEW_TASK, task, parentUrl)
        .send(taskConnection);
    });

    comunication.on(Constants.TASK_DONE, (task, objectToStore) => {
      // console.log(objectToStore.title);
      // console.log(task);
      // console.log(taskQueue.getConnectionsDebug());
      taskQueue.markTaskDone(task);
      mongoUtil.addNews(convertObjectForMongo(objectToStore));
      try {
        links += 1;
        if (links >= Math.max([limit, taskQueue.getTasksDebug().length])) {
          console.log('-----');
          console.log(taskQueue.tasks);
          console.log(taskQueue.getTasksDebug());
          console.log('-----');
        } else {
          console.log(`Done ${links}:t:${objectToStore.title}.l:${taskQueue.getTasksDebug().length}`);
        }
      } catch (e) {
        console.log(e.message);
      }

      taskQueue.checkTasks();

      // console.log(taskQueue.getConnectionsDebug());
      // console.log('-----');
      // console.log(taskQueue.getTasksDebug());
      // console.log('-----');
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
  };
}

module.exports = {
  handleConnection,
  addTask: (task) => {
    taskQueue.addTask(task);
  },
};
