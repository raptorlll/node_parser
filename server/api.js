/**
 * task:
 2. На node.js сделать http api,
 отдающее документы с новостями из mongo db в
 пределах определённых широты/долготы (в радиусе N км от заданной точки).
 Использовать geospatial запросы mongo db.
 Пример обращения к api:
 GET http://127.0.0.1:8080/api/news?lat=A&long=B&radius=R
 [
 {...новость 1...},
 {...новость 2...},
 ...
 ]
 3. На node.js сделать http api, запускающее подсчёт количества употреблений каждого слова во всех
 новостях из коллекции с помощью mongo db mapreduce
 (разные формы слова считать разными словами).
 Результаты отсортировать по частоте употребления
 слов по убыванию. Пример обращения к api:
 GET http://127.0.0.1:8080/api/words
 {
   "и": 1200,
   "a": 1150,
   "к": 1087,
   "которых": 980,
   "вместе": 889,
   "протестами": 666,
   "акцию": 117,
   "сталагмит": 3
 }
 */
//nodemon server/api.js
const express = require('express');
const app = express();
const PORT = 8080;
const mongoUtil = require('./mongoUtil');
mongoUtil.connectToServer();
/**
 * get request on api entry point
 * like http://127.0.0.1:8080/api/news?lat=53.4319953&long=27.5610421&radius=12
 */
app.get('/api/news', function (req, res) {
    const {lat, long, radius} = req.query;
    if (!lat || !long || !radius)
        return res.status(400).json({
            errorMessage: 'Required parameters lat, long, radius'
        });

    const latFloat = parseFloat(lat);
    const longFloat = parseFloat(long);
    /**
     * Radius in meters
     * @type {Number}
     */
    const radiusInt = parseInt(radius);

    mongoUtil
        .getDb()
        .collection('news')
        /**
         * Find by 2dsphere geolocation index
         */
        .find({
            'location.locationPoint': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longFloat, latFloat]
                    },
                    $maxDistance: radiusInt,
                    $minDistance: 0
                }
            }
        })
        /**
         * Get all records as array
         * todo:
         * [toArray]
         * I don`t know better solution, seems
         * that we may change to "streaming" function
         */
        .toArray((error, data) => {
            if (error)
                return res.status(500).json({
                    errorMessage: 'Error while processing query',
                    error
                });

            return res.json(data);
        });

});
/**
 * Map reduce
 */
var mapFunction = function() {
    // console.log('Map');
    /**
     * First replace line breaks
     * and replace multimle
     * Suggest that there are wrong formatting
     * so first split by whitespace
     * and after
     * todo: better line clearing
     */
    if(!this.content){
        return;
    }
    let content = this.content.replace(/[\r\n.,!?]/g, '').replace(/\s\s+/g, ' ');
    /**
     * Split
     */
    let words = content.split(/[\s,]+/);
    words.map((word)=>{
        emit(word, 1);
    });
};
var reduceFunction = function(keyCustId, valuesPrices) {
    return Array.sum(valuesPrices);
};
app.get('/api/words', function (req, res) {
    mongoUtil
        .getDb()
        .collection('news_words')
        .remove({});

    mongoUtil
        .getDb()
        .collection('news')
        .mapReduce(
            mapFunction,
            reduceFunction,
            { out: "news_words" }
        );
    //db.getCollection('news_words').find().sort({value: -1})
    return res.json({
        status: 'OK'
    });
});

/**
 * Creating server
 * @type {http.Server}
 */
const server = app.listen(PORT, function () {
    console.log('Example app listening on port 3000!');
});

/**
 * Execute closing mongodb connection
 */
server.on('close', ()=>{
    console.log('   Server stopped');
    process.exit(0);
    mongoUtil.close();
});

/**
 * on CTRL + C
 */
process.on('SIGINT', function() {
    server.close();
});
