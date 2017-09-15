const request = require('request');
const cheerio = require('cheerio');
const validator = require('validator');

function getMainPageLinks(url, limit) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) {
        reject(error);
      }

      const $ = cheerio.load(body);
      resolve($('a[href][data-hint-source]')
        .filter((index, element) => validator.isURL(element.attribs.href))
        .map((index, element) => element.attribs.href).slice(0, limit));
    });
  });
}

function parseDataNestedNews(callGoogleApi) {
  return callback => (error, response, body) => {
    const dataToStore = {};
    const $ = cheerio.load(body);
    /**
       * Parse datetime
       */
    const date = $('[itemprop="datePublished"]').slice(0, 1);
    if (date.length) {
      dataToStore.date = new Date(date.attr('datetime'));
    } else {
      dataToStore.date = null;
    }
    /**
       * News title
       */
    const title = $('h1').slice(0, 1);
    dataToStore.title = title.length ? title.text() : null;
    /**
       * Plain text without html tags
       */
    const content = $('#article_body').slice(0, 1);
    dataToStore.content = content.length ? content.text() : null;
    /**
       * Coordinates (maybe few)
       * here we can find addres parameter if find
       */
    callGoogleApi().then((data) => {
      dataToStore.location = data;
      callback(null, dataToStore);
    }).catch((err) => {
      dataToStore.location = [];
      callback(err.message, dataToStore);
    });
  };
}

module.exports = {
  parseDataNestedNews,
  getMainPageLinks,
};
