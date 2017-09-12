/** Cli interface */
const program = require('commander');

const {getMainPageLinks, getInnerPagesData} = require('./linksParser');
//http://mongodb.github.io/node-mongodb-native/2.2/tutorials/crud/
const mongoUtil = require('./mongoUtil');
mongoUtil.connectToServer();

/**
 * Таск в jira: https://jira.itransition.com/browse/SELF-3530
 В копии Фёдор - технический эксперт по фронтенду в нашей команде -
 на код ревью своё решение отправишь потом ему.
 Также можешь консультироваться с ним по ходу дела.

 1. На node.js написать скрипт-парсер новостей с https://news.tut.by/
 (ввести ограничение на количество новостей для парсинга,
 например, 50 по умолчанию, можно передать произвольное
 через аргумент командной строки).
 Результаты парсинга каждой новости сохранять в mongo db.
 Для каждой новости сохранять:
 - Дату/время
 - Название
 - Содержимое, очищенное от html тегов (plain text)
 - Координаты (если возможно) - может быть одно или несколько значений.
 Внизу почти каждой новости есть блок, в котором могут быть указаны страна,
 регион, область, город (либо только некоторые компоненты).
 Используя Google Maps Geocoding API
 преобразовывать адрес (страна + регион/область + город)
 в координаты (широту и долготу), которые и сохранять.
 По коллекции с новостями построить geospatial
 индекс
 https://docs.mongodb.com/v3.0/applications/geospatial-indexes/
 и добавить составной unique индекс
 по дате/времени и названию.
 */

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
    .then((linksCollection)=>{

        mongoUtil
            .getDb()
            .collection('news')
            .remove({}).then(()=>{
                console.log('Removed');
            });

        /**
         * Nested walk links
         */
        for (let link of Array.prototype.slice.call(linksCollection, 0)) {
            getInnerPagesData(link)
                .then((objPrepared)=>{
                    mongoUtil
                        .getDb()
                        .collection('news')
                        .insert(objPrepared, function (err, r) {
                            if(err){
                                console.log('Error while saving', err.toString());
                            }
                            console.log('Successfully saved');
                        });
                })
                .catch((error)=>{
                    console.log('Error', error);
                });
        }
    })
    .catch((error)=>{
        console.log('Error', error);
    });

return 0;
