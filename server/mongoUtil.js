let MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

// Connection URL
let url = 'mongodb://localhost:27017/itran_project';
let _db = null;

module.exports = {
    connectToServer: function () {
        if (!_db)
            MongoClient.connect(url, function (err, db) {
                assert.equal(null, err);

                db.collection('news').dropAllIndexes();

                db.collection('news')
                    .createIndex({title: 1, date: 1}, {background: true}, (err, result)=>{
                        console.log('Index compound created');
                    });

                db.collection('news')
                    .createIndex(
                        {'location.locationPoint': "2dsphere"},
                        {background: true},
                        (err, result)=>{
                            console.log('Index geo created');
                        }
                    );

                _db = db;
            });
    },
    getDb: function () {
        return _db;
    },
    close: () => {
        _db.close();
    }
};
