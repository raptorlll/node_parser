const tutby = require('./parsers/tutby.js');

function detect(url) {
  switch (url) {
    case 'https://news.tut.by/':
      return tutby;
    default:
      return false;
  }
}

function getMainPageLinks(url) {
  const parserObj = detect(url);
  return parserObj.getMainPageLinks;
}

function parseDataNestedNews(url) {
  const parserObj = detect(url);
  return parserObj.parseDataNestedNews;
}

module.exports = {
  getMainPageLinks,
  parseDataNestedNews,
};
