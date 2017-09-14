/* eslint-disable no-underscore-dangle */
const { Slave } = require('./comunication');
/* const { getMainPageLinks } = require('../linksParser'); */
const { getInnerPagesData } = require('../linksParser');
const Constants = require('./taskConstants');

function handleConnection() {
  const comunication = new Slave();
  comunication.message('Hello from client').send(this);

  comunication.on(Constants.NEW_TASK, (task, parentUrl) => {
    // console.log('Received task', task);
    // console.log('Parent url', parentUrl);

    getInnerPagesData(parentUrl, task)
      .then((objPrepared) => {
        comunication
          .event(Constants.TASK_DONE, task, objPrepared)
          .send(this);
        console.log(`Sended : ${task}`);

        // console.log('Send', objPrepared);
      })
      .catch((error) => {
        console.log('Error', error.message);
      });
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
