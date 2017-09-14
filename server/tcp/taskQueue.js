/* eslint-disable no-underscore-dangle */
const Observer = require('./observer');

class TaskQueue extends Observer {
  static get STATUS_WAIT() {
    return 'wait';
  }

  static get STATUS_IN_WORK() {
    return 'STATUS_IN_WORK';
  }

  static get STATUS_DONE() {
    return 'STATUS_IN_WORK';
  }

  constructor() {
    super();
    this.tasks = {};
    this.connections = [];
    this.inWork = 0;
  }

  static getConnectionName(connection) {
    return `${connection._socket.remoteAddress}:${connection._socket.remotePort}`;
  }

  checkTasks() {
    const connectionElement = this.connections.find(connection => connection.free);
    /**
     * Detect that we have free connection
     */
    if (connectionElement === 'undefined') {
      return false;
    }

    /**
     * Detect free tasks
     */
    const { connection } = connectionElement;
    const waitTask = this.getOneWait();

    if (waitTask === undefined) {
      return false;
    }

    /**
     * Finaly have connection and task
     */
    this.markTaskInWork(waitTask, connection)
      .then(() => {
        this.fire('newTask', connection, waitTask);
      })
      .catch((error) => {
        console.log('Error', error.message);
      });
    return false;
  }

  addConnection(connection) {
    this.connections.push({
      connection,
      free: true,
    });
  }

  removeConnection(connection) {
    const taskKey = Object
      .keys(this.tasks)
      .find(key => this.tasks[key].status === TaskQueue.STATUS_IN_WORK
        && this.tasks[key].performer.socketName() === connection.socketName());

    this.markStatusWait(taskKey);

    delete this.connections[Object
      .keys(this.connections)
      .find(key => this.connections[key].connection.socketName() === connection.socketName())];
  }

  addTask(task) {
    const taskKey = this.getTaskKey(task);
    this.tasks[taskKey] = {
      status: TaskQueue.STATUS_WAIT,
      performer: null,
      task: taskKey,
    };
  }

  /**
   * get key anyway
   * @param task
   */
  static getTaskKey(task) {
    return typeof task.task !== 'undefined' ? task.task : task;
  }

  removeTask(task) {
    const taskKey = this.getTaskKey(task);
    delete this.tasks[taskKey];
  }

  markTaskDone(task) {
    const taskKey = this.getTaskKey(task);
    this.tasks[taskKey].status = TaskQueue.STATUS_WAIT;
  }

  markStatusWait(taskKey) {
    this.tasks[taskKey].performer = null;
    this.tasks[taskKey].status = TaskQueue.STATUS_WAIT;
  }

  markTaskInWork(task, connection) {
    return new Promise((res, rej) => {
      if (this.tasks.status === TaskQueue.STATUS_WAIT) {
        /**
         * Preventing racing situation
         */
        rej(new Error('Already in work'));
      }

      const taskKey = this.getTaskKey(task);

      /**
       * don`t have sense
       */
      this.setConnectionAsFree(connection, false);
      Object.assign(this.tasks[taskKey], {
        status: TaskQueue.STATUS_IN_WORK,
        performer: connection.socketName(),
      });
      res(this.tasks);
    });
  }

  setConnectionAsFree(connection, free = true) {
    // console.log('FRee', connection);
    this.connections[
      Object
        .keys(this.connections)
        .find(key =>
          this.connections[key].connection.socketName() === connection.socketName())
    ].free = free;
  }

  getOneWait() {
    return Object.keys(this.tasks).find(key => this.tasks[key].status === TaskQueue.STATUS_WAIT);
  }
}

module.exports = TaskQueue;
