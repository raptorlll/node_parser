let Observer = require('./observer');
class Communicator extends Observer{
    constructor() {
        super();
        this.sendData = {};
        return this;
    }

    message(data, type = 'message') {
        this.sendData[type] = data;
        return this;
    }



    event(event, data = true){
        if(typeof this.sendData.events === 'undefined'){
            this.sendData.events = []
        }
        this.sendData.events.push({event, data: data});
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
        if(typeof data.events !== 'undefined'){
            data.events.forEach((value, key)=>{
                this.fire(value.event, value.data);
            });
        }
    }
}

class Master extends Communicator {
    disconnect(){
        this.command(1, 'disconnect')
    }
    detect(data){
        // console.log('!!!!!---'+buffer.toString()+'---!!!!!!!');
        // let data = JSON.parse(buffer.toString());
        // let data = JSON.parse(buffer.toString());
        this.detectCommon(data);
    }
}

class Slave extends Communicator {
    detect(data){
        // console.log('!!!!!---'+buffer.toString()+'---!!!!!!!');
        // let data = JSON.parse(buffer.toString());
        this.detectCommon(data);
        if(typeof data.disconnect !== 'undefined'){
            this.connection.close();
        }
    }
}

module.exports = {
    Master,
    Slave
};