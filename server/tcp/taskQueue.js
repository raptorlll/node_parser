let Observer = require('./observer');

class TaskQueue extends Observer{
    static get STATUS_WAIT() { return 'wait'; }
    static get STATUS_IN_WORK() { return 'STATUS_IN_WORK'; }
    static get STATUS_DONE() { return 'STATUS_IN_WORK'; }

    constructor(){
        super();
        this.tasks = {};
        this.connections = [];
        this.inWork = 0;
        // this.inWork = 0;
    }

    getConnectionName(connection){
        return connection._socket.remoteAddress + ':' + connection._socket.remotePort;
    }
    checkTasks(){
        let connectionElement = this.connections.find((connection)=>{
            return connection.free;
        });
        /**
         * Detect that we have free connection
         */
        if(connectionElement==='undefined'){
            return false;
        }
        // console.log('___!',connection);
        /**
         * Detect free tasks
         */
        let connection = connectionElement.connection;
        let waitTask = this.getOneWait();
        console.log("W",waitTask);
        console.log("С",connection.socketName());
        if(waitTask===undefined){
            return false;
        }

        /**
         * Finaly have connection and task
         */
        this.markTaskInWork(waitTask, connection)
            .then(()=>{
                this.fire('newTask', connection, waitTask);
            })
            .catch((message)=>{
                console.log('Error', message);
            });
    }



    addConnection(connection) {
        this.connections.push({
            connection,
            free: true
        });

    }

    removeConnection(connection) {

        let taskKey = Object.keys(this.tasks).find((key)=> {
            return this.tasks[key].status === TaskQueue.STATUS_IN_WORK
                && this.tasks[key].performer.socketName() === connection.socketName();
        });

        this.markStatusWait(taskKey);

        delete this.connections[Object.keys(this.connections).find((key)=>{
            return this.connections[key].connection.socketName() === connection.socketName();
        })];
    }


    addTask(task) {
        const taskKey = task;//this.getTaskKey(task);
        this.tasks[taskKey] = {
            status: TaskQueue.STATUS_WAIT,
            performer: null,
            task: taskKey
        };
        // this.checkTasks();
    }
    /**
     * get key anyway
     * @param task
     */
    getTaskKey(task){
        return typeof task.task!== 'undefined' ? task.task : task;
    }

    removeTask(task) {
        const taskKey = this.getTaskKey(task);
        delete tasks[taskKey];
    }
    markTaskDone(task){
        const taskKey = this.getTaskKey(task);
        this.tasks[taskKey].status = TaskQueue.STATUS_WAIT;
    }

    markStatusWait(taskKey) {
        this.tasks[taskKey].performer = null;
        this.tasks[taskKey].status = TaskQueue.STATUS_WAIT;
    }
    markTaskInWork(task, connection){
        return new Promise((res, rej)=>{
            if(this.tasks.status === TaskQueue.STATUS_WAIT){
                /**
                 * Preventing racing situation
                 */
                rej('Already in work');
            }
            const taskKey = this.getTaskKey(task);
            /**
             * don`t have sense
             */
            this.setConnectionAsFree(connection, false);
            Object.assign(this.tasks[taskKey], {
                status: TaskQueue.STATUS_IN_WORK,
                performer: connection.socketName()
            });
            res(this.tasks);
        });
    }

    setConnectionAsFree(connection, free = true) {
        // console.log('FRee', connection);
        this.connections[Object.keys(this.connections).find((key) => {
            return this.connections[key].connection.socketName() === connection.socketName();
        })].free = free;
    }
    getOneWait(){
        return Object.keys(this.tasks).find((key)=> this.tasks[key].status === TaskQueue.STATUS_WAIT);
    }

}
module.exports = TaskQueue;