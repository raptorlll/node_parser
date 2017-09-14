/** Cli interface */
const program = require('commander');
const { getMainPageLinks, getInnerPagesData } = require('./linksParser');

const mongoUtil = require('./mongoUtil');

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
    mongoUtil
      .getDb()
      .collection('news')
      .remove({}).then(() => {
        console.log('Removed');
      });

    /**
         * Nested walk links
         */
    Array.prototype.slice.call(linksCollection, 0).forEach((link) => {
      getInnerPagesData(link)
        .then((objPrepared) => {
          mongoUtil
            .getDb()
            .collection('news')
            .insert(objPrepared, (err) => {
              if (err) {
                console.log('Error while saving', err.toString());
              }

              console.log('Successfully saved');
            });
        })
        .catch((error) => {
          console.log('Error', error.message);
        });
    });
  })
  .catch((error) => {
    console.log('Error', error);
  });

