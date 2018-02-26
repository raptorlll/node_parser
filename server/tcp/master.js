/* eslint-disable no-underscore-dangle */
const Constants = require('./taskConstants');
const { Master } = require('./comunication');
const TaskQueue = require('./taskQueue');
const JsonSocket = require('./json-socket');
const mongoUtil = require('../mongoUtil');
const { getInnerPagesData } = require('../linksParser');

mongoUtil.connectToServer();
const taskQueue = new TaskQueue();

const comunication = new Master();

function convertObjectForMongo(obj) {
  const mongoObject = Object.assign({}, obj);
  mongoObject.date = new Date(obj);
  return mongoObject;
}

let links = 0;
let initSelveslave = false;

function initFictiveConnection() {
  const connection = {
    isReal: false,
  };
  connection.socketName = function socketName() {
    return 'Fictive connection on default port';
  };

  return connection;
}

function addEventFictiveConnectionTask(comunicationParam, connectionFictive) {
  comunicationParam.on(Constants.NEW_TASK, (task, parentUrlParam) => {
    getInnerPagesData(parentUrlParam, task)
      .then((objPrepared) => {
        comunicationParam
          .event(Constants.TASK_DONE, task, objPrepared)
          .send(connectionFictive);
      })
      .catch((error) => {
        console.log('Error', error.message);
      });
  });
}

function handleConnection(parentUrl, limit, delay, selveslave) {
  return function handleConnectionInner(connectionToDecorate) {
    const connection = new JsonSocket(connectionToDecorate);
    console.log('Name', connection.socketName());
    if (!initSelveslave && selveslave) {
      initSelveslave = true;
      const connectionFictive = initFictiveConnection();
      taskQueue.addConnection(connectionFictive);
      addEventFictiveConnectionTask(comunication, connectionFictive);
    }

    connection.isReal = true;
    taskQueue.addConnection(connection);
    taskQueue.checkTasks();
    comunication.message('Server wait').send(connection);

    function onConnectionData(d) {
      comunication.detect(d);
    }

    function onConnectionClose() {
      taskQueue.removeConnection(connection);
    }

    function onConnectionError(err) {
      console.error('Connection %s error: %s', err.message);
    }

    function newTask(taskConnection, task) {
      setTimeout(() => {
        comunication
          .event(Constants.NEW_TASK, task, parentUrl)
          .send(taskConnection);
      }, delay);
    }

    function checkLinksLimits(linksNumber, limitNumber, taskQueueObj) {
      /**
       * Tasks ended
       */
      return (linksNumber >= Math.min(limitNumber, taskQueueObj.getTasksDebug().length));
    }

    function saveDoneTask(task, objectToStore) {
      taskQueue.markTaskDone(task);
      mongoUtil.addNews(convertObjectForMongo(objectToStore));
      links += 1;
      if (checkLinksLimits(links, limit, taskQueue)) {
        console.log('-----');
        console.log('Tasks done');
        console.log(taskQueue.getTasksDebug());
        console.log('-----');
        taskQueue.connections.forEach((connectionSaved) => {
          taskQueue.removeConnection(connectionSaved.connection);
          comunication
            .event(Constants.END_COMMUNICATION_TASK)
            .send(connectionSaved.connection);
        });
      } else {
        console.log(`${links}/${taskQueue.getTasksDebug().length}:t:${objectToStore.title}`);
      }

      taskQueue.checkTasks();
    }

    connection.on('message', onConnectionData);
    connection.on('close', onConnectionClose);
    connection.on('error', onConnectionError);

    comunication.on(Constants.TASK_DONE, saveDoneTask);
    taskQueue.on('newTask', newTask);
  };
}

module.exports = {
  handleConnection,
  addTask: (task) => {
    taskQueue.addTask(task);
  },
};
