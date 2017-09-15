/** Cli interface */
require('./config');
const program = require('commander');
const { getMainPageLinks, getInnerPagesData } = require('./linksParser');
const mongoUtil = require('./mongoUtil');

// console.log(process.env.MONGO_CONNECTION_STRING);
// process.exit(0);
mongoUtil.connectToServer();

program
  .version('0.0.1')
  .option('-l, --limit <limit>', 'urls limit', 50)
  .option('-u, --url <url>', 'url to parse', 'https://news.tut.by/')
  .parse(process.argv); // end with parse to parse through the input

/**
 *
 * @param string
 * @returns {Promise}
 */
getMainPageLinks(program.url, program.limit)
  .then((linksCollection) => {
    mongoUtil.dropNews();
    /**
     * Nested walk links
     */
    Array.prototype.slice.call(linksCollection, 0).forEach((link) => {
      getInnerPagesData(program.url, link)
        .then((objPrepared) => {
          mongoUtil.addNews(objPrepared);
          console.log('Added news');
        })
        .catch((error) => {
          console.log('Error', error.message);
        });
    });
  })
  .catch((error) => {
    console.log('Error', error);
  });

