/* eslint-disable no-underscore-dangle */
require('./config');
const express = require('express');

const app = express();
const PORT = 8080;
const mongoUtil = require('./mongoUtil');

mongoUtil.connectToServer();

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
    .getNewsInRadius(latFloat, longFloat, radiusInt)
    .then((out) => {
      res.json(out);
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
});

/**
 * Map-reduce
 */
app.get('/api/words', (req, res) => {
  mongoUtil.dropNews();
  mongoUtil
    .getWordsCount()
    .then((out) => {
      res.json(out);
    })
    .catch((error) => {
      res.status(500).send(error.message);
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
