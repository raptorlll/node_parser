const { MongoClient } = require('mongodb');
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017/itran_project';
let db = null;

module.exports = {
  connectToServer() {
    if (!db) {
      MongoClient.connect(url, (err, dbActive) => {
        assert.equal(null, err);

        dbActive.collection('news').dropAllIndexes();

        dbActive.collection('news')
          .createIndex(
            { title: 1, date: 1 },
            { background: true },
            () => {
              console.log('Index compound created');
            },
          );

        dbActive.collection('news')
          .createIndex(
            { 'location.locationPoint': '2dsphere' },
            { background: true },
            () => {
              console.log('Index geo created');
            },
          );

        db = dbActive;
      });
    }
  },

  getDb() {
    return db;
  },

  close: () => {
    db.close();
  },
};
