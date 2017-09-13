class Observer {
    constructor(){
        this.handlers = {

        };
    }
    on(eventName, fn) {
        fn.bind(this);
        this.handlers[eventName] = fn;
    }
    unsubscribe(eventName) {
        delete this.handlers[eventName];
    }
    fire(eventName, ...data) {
        if(typeof this.handlers[eventName] === 'undefined')
            return false;

        this.handlers[eventName].apply(null, data)
    }
}
module.exports = Observer;