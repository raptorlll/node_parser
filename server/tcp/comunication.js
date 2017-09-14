const Observer = require('./observer');

class Communicator extends Observer {
  constructor() {
    super();
    this.sendData = {};
    return this;
  }

  message(data, type = 'message') {
    this.sendData[type] = data;
    return this;
  }

  event(event, ...data) {
    if (typeof this.sendData.events === 'undefined') {
      this.sendData.events = [];
    }

    this.sendData.events.push({
      event,
      data,
    });
    return this;
  }

  send(connection) {
    connection.sendMessage(this.sendData);
    this.sendData = {};
  }

  detectCommon(data) {
    if (typeof data.message !== 'undefined') {
      console.log('Incoming message:', data.message);
    }

    if (typeof data.errorMessage !== 'undefined') {
      console.log('Incoming error message:', data.errorMessage);
    }

    if (typeof data.events !== 'undefined') {
      data.events.forEach((value) => {
        this.fire(value.event, ...value.data);
      });
    }
  }
}

class Master extends Communicator {
  disconnect() {
    this.command(1, 'disconnect');
  }

  detect(data) {
    this.detectCommon(data);
  }
}

class Slave extends Communicator {
  detect(data) {
    this.detectCommon(data);
    if (typeof data.disconnect !== 'undefined') {
      this.connection.close();
    }
  }
}

module.exports = {
  Master,
  Slave,
};
