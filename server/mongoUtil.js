/* eslint-disable no-underscore-dangle */
const { MongoClient } = require('mongodb');
const { mapFunction, reduceFunction } = require('./textUtils');

const tempTable = 'news_statistic';
let db = null;

function initIndexes(dbActive) {


  dbActive
    .collection('news')
    .dropAllIndexes();

  dbActive
    .collection('news')
    .createIndex(
      { title: 1, date: 1 },
      { background: true }
    );

  dbActive
    .collection('news')
    .createIndex(
      { 'location.locationPoint': '2dsphere' },
      { background: true }
    );
}

/**
 * To start service:
 * sudo service mongod start
 */
function connectToServer() {
  if (db) {
    return;
  }

  MongoClient.connect(process.env.MONGO_CONNECTION_STRING, (err, dbActive) => {
    if (err !== null) {
      console.warn('Fail connect to server');
      process.exit(1);
    }

    initIndexes(dbActive);
    db = dbActive;
  });
}

function getDb() {
  return db;
}

function addNews(objPrepared) {
  getDb()
    .collection('news')
    .insert(objPrepared, (err) => {
      if (err) {
        console.log('Error while saving', err.toString());
      }
    });
}

function dropNews() {
  getDb()
    .collection('news')
    .remove({});
}

function dropTmpNews() {
  getDb()
    .collection('news_words')
    .remove({});
}

function dropTmpTable(reject) {
  getDb()
    .collection(tempTable)
    .drop((err) => {
      if (err) {
        reject(new Error(err.toString()));
      }
    });
}

function getNewsInRadius(latFloat, longFloat, radiusInt) {
  return new Promise((resolve, reject) => {
    getDb()
      .collection('news')
      .find({
        'location.locationPoint': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longFloat, latFloat],
            },
            $maxDistance: radiusInt,
            $minDistance: 0,
          },
        },
      })
      .toArray((error, data) => {
        if (error) {
          reject(new Error(error));
        }

        resolve(data);
      });
  });
}

function getWordsCount() {
  function getArrayByCollection(data, reject, resolve) {
    data
      .find({})
      .sort({ value: -1 })
      .toArray((error, dataArray) => {
        if (error) {
          reject(new Error(error.toString()));
        }

        dropTmpTable(reject);

        const outputData = dataArray
          .reduce((carry, collectionElement) => Object.assign(carry, {
            [collectionElement._id]: collectionElement.value,
          }), {});

        resolve(outputData);
      });
  }

  return new Promise((resolve, reject) => {
    getDb()
      .collection('news')
      .mapReduce(
        mapFunction,
        reduceFunction,
        {
          out: tempTable,
          sort: { value: -1 },
        }
      ).then((data) => {
        getArrayByCollection(data, reject, resolve);
      });
  });
}

function close() {
  db.close();
}

connectToServer();

module.exports = {
  connectToServer,
  addNews,
  getDb,
  dropNews,
  close,
  getWordsCount,
  getNewsInRadius,
  dropTmpNews,
};
