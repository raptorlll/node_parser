const request = require('request');
/**
 * @param Array townsList
 */
const townsList = require('./towns/list.json');
const { prepareLocation } = require('./dataPreparation');
const parserInitializator = require('./parserInitializator');

function geolocationApi(string = '') {
  const parameters = {
    key: process.env.GOOGLE_MAPS_KEY,
    language: 'en',
  };
  /**
   * There are no possibility to check address so we use
   * random name
   */
  parameters.address = string.length ?
    string :
    'Беларусь, Минская область, '.concat(townsList[Math.floor(Math.random() * townsList.length)]);

  return new Promise((resolve, reject) => {
    request({
      url: 'https://maps.googleapis.com/maps/api/geocode/json',
      qs: parameters,
    }, (error, response, body) => {
      if (error) { reject(new Error(`Error in nested link ${error}`)); }

      let bodyResponse;
      try {
        bodyResponse = JSON.parse(body);
      } catch (e) {
        reject(new Error(`Wrong geocoding api response. ${e.message}`));
      }

      if (bodyResponse.status !== 'OK'
          || typeof bodyResponse.error_message !== 'undefined'
      ) {
        reject(new Error(`Wrong geocoding api response. Status ${bodyResponse.status}`));
      } else {
        const dataFormated = bodyResponse.results.map(prepareLocation);
        resolve(dataFormated);
      }
    });
  });
}

function getMainPageLinks(url, limit) {
  return (parserInitializator.getMainPageLinks(url))(url, limit);
}

function parseDataNestedNews(parentUrl) {
  return parserInitializator.parseDataNestedNews(parentUrl)(geolocationApi);
}

function getInnerPagesData(parentUrl, url) {
  return new Promise((resolve) => {
    request(url, parseDataNestedNews(parentUrl)((error, objPrepared) => {
      if (error) {
        console.log(`Error: ${error}, ${objPrepared}`);
      }

      resolve(objPrepared);
    }));
  });
}

module.exports = {
  getMainPageLinks,
  getInnerPagesData,
};
