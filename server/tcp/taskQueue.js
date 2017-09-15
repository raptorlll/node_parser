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
    return 'STATUS_DONE';
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
    if (connectionElement === undefined) {
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

    this.checkTasks();
    return false;
  }

  getConnectionsDebug() {
    return this.connections.map(value =>
      Object.assign({}, value, { connection: value.connection.socketName() }));
  }

  getTasksDebug() {
    return Object.keys(this.tasks).map(key => Object.assign(
      {},
      this.tasks[key],
      {
        performer: this.tasks[key].performer !== null
          ? this.tasks[key].performer.socketName()
          : null,
      }
    ));
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
        && Object.is(this.tasks[key].performer, connection));

    if (typeof taskKey !== 'undefined') {
      this.markStatusWait(taskKey);
    }

    delete this.connections[Object
      .keys(this.connections)
      .find(key => Object.is(this.connections[key].connection, connection))];
  }

  addTask(task) {
    const taskKey = TaskQueue.getTaskKey(task);
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
    return (typeof task.task !== 'undefined') ? task.task : task;
  }

  removeTask(task) {
    const taskKey = TaskQueue.getTaskKey(task);
    delete this.tasks[taskKey];
  }

  markTaskDone(task) {
    const taskKey = TaskQueue.getTaskKey(task);
    this.tasks[taskKey].status = TaskQueue.STATUS_DONE;
    this.setConnectionAsFree(this.tasks[taskKey].performer, true);
  }

  markStatusWait(task) {
    const taskKey = TaskQueue.getTaskKey(task);
    this.tasks[taskKey].performer = null;
    this.tasks[taskKey].status = TaskQueue.STATUS_WAIT;
  }

  getPerformer(task) {
    const taskKey = TaskQueue.getTaskKey(task);
    return this.tasks[taskKey].performer;
  }

  markTaskInWork(task, connection) {
    return new Promise((res, rej) => {
      if (this.tasks.status === TaskQueue.STATUS_WAIT) {
        /**
         * Preventing racing situation
         */
        rej(new Error('Already in work'));
      }

      const taskKey = TaskQueue.getTaskKey(task);

      /**
       * don`t have sense
       */
      this.setConnectionAsFree(connection, false);
      Object.assign(this.tasks[taskKey], {
        status: TaskQueue.STATUS_IN_WORK,
        performer: connection,
      });
      res(this.tasks);
    });
  }

  setConnectionAsFree(connection, free = true) {
    this.connections[
      Object
        .keys(this.connections)
        .find(key =>
          Object.is(this.connections[key].connection, connection))
    ].free = free;
  }

  getOneWait() {
    return Object.keys(this.tasks).find(key => this.tasks[key].status === TaskQueue.STATUS_WAIT);
  }
}

module.exports = TaskQueue;
