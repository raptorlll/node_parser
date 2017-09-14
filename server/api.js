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

const express = require('express');
const { serverError } = require('./serverHelpers');

const app = express();
const PORT = 8080;
const mongoUtil = require('./mongoUtil');

mongoUtil.connectToServer();

/**
 * Map reduce
 */
function mapFunction() {
  /**
   * First replace line breaks
   * and replace multimle
   * Suggest that there are wrong formatting
   * so first split by whitespace
   * and after
   * todo: better line clearing
   */
  if (!this.content) {
    return;
  }

  const content = this.content.toLowerCase()
    .replace(/[\r\n.,!?]|[^A-Za-zА-Яа-яЁё\s]|[0-9]/g, '')
    .replace(/\s\s+/g, ' ');

  /**
   * Split
   */
  const words = content.split(/[\s,]+/);
  words.forEach((word) => {
    emit(word, 1);
  });
}

function reduceFunction(keyCustId, valuesPrices) {
  return Array.sum(valuesPrices);
}
/**
 * get request on api entry point
 * like http://127.0.0.1:8080/api/news?lat=53.4319953&long=27.5610421&radius=12
 */
app.get('/api/news', (req, res) => {
  const { lat, long, radius } = req.query;

  if (!lat || !long || !radius) {
    return res.status(400).json({
      errorMessage: 'Required parameters lat, long, radius',
    });
  }

  // Radius in meters
  const radiusInt = Number.parseInt(radius, 10);
  const latFloat = Number.parseFloat(lat);
  const longFloat = Number.parseFloat(long);

  /**
   * Find by 2dsphere geolocation index
   *
   * Get all records as array
   * todo:
   * [toArray]
   * I don`t know better solution, seems
   * that we may change to "streaming" function
   */
  mongoUtil
    .getDb()
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
        return serverError(res, error);
      }

      return res.json(data);
    });
});

/**
 * Map-reduce
 */
app.get('/api/words', (req, res) => {
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
      {
        out: 'news_statistic',
        sort: { value: -1 },
      },
    ).then((data) => {
      data.find({}).sort({ value: -1 }).toArray((error, dataArray) => {
        if (error) { return serverError(res, error); }

        mongoUtil
          .getDb()
          .collection('news_statistic')
          .drop((error, ok) => {
            if (error) {
              return res.status(500).json({
                errorMessage: 'Error while processing query',
                error,
              });
            }
          });

        return res.json(dataArray.reduce((carry, collectionElement) => Object.assign(carry, {
          [collectionElement._id]: collectionElement.value,
        }), {}));
      });
    });
});

/**
 * Creating server
 * @type {http.Server}
 */
const server = app.listen(PORT, () => {
  console.log('Example app listening on port 3000!');
});

/**
 * Execute closing mongodb connection
 */
server.on('close', () => {
  console.log('   Server stopped');
  process.exit(0);
  mongoUtil.close();
});

/**
 * on CTRL + C
 */
process.on('SIGINT', () => {
  server.close();
});
