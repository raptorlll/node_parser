const cheerio = require('cheerio');
const http = require('http');
const request = require('request');
/** Cli interface */
const program = require('commander');
/**
 * @param Array townsList
 */
let { isValidUrl, prepareLocation, prepareAddress } = require('./dataPreparation');
const townsList = require('./towns/list');
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

 4. (бонусное) Реализовать скрипт-парсер из (1) в виде сервера и клиентов.
 Клиенты подключаются к серверу через TCP сокет,
 получают от него необходимые им параметры, парсят новости и отсылают
 результаты серверу, который сохраняет результаты в БД
 (БД одна и с ней взаимодействует только сервер).
 Сам сервер также может парсить новости. Т.е. скрипт может работать
 как в режиме клиента, так и в режиме сервера в зависимости от переданных аргументов.
 Предусмотреть борьбу с условиями состязаний (гонками) - чтобы одна и та же новость не
 парсилась двумя и более клиентами и в БД не появлялись дубликаты новостей.
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
function callGoogleApi(string = '') {
    let parameters = {
        key: 'AIzaSyBI0T2Nh8AZN6J2j1tZ_VamHY1qNFrKVmA',
        language: 'en'
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
            qs: parameters
        }, (error, response, body) => {
            if (error)
                reject('Error in nested link ' + error);
            let bodyResponse = JSON.parse(body);

            if (
                bodyResponse.status !== 'OK'
                || typeof bodyResponse.error_message !== 'undefined'
            ) {
                reject('Wrong geocoding api response. Status '+ bodyResponse.status);
            } else {
                let dataFormated = bodyResponse.results.map(prepareLocation);
                resolve(dataFormated);
            }
        })
    });
}

function parseDataNestedNews(callback) {
    return (error, response, body) => {
        let dataToStore = {};
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
        }).catch((error) => {
            dataToStore.location = [];
            callback(error, dataToStore);
        });
    };
}

request(program.url, (error, response, body) => {
    if (error) {
        console.log("Error", error);
        return;
    }
    const $ = cheerio.load(body);
    let linksCollection = $('a[href][data-hint-source]').filter((index, element) => {
        let link = element.attribs.href;
        if (!isValidUrl(link))
            return false;

        return true;
    }).map((index, element) => {
        return element.attribs.href;
    }).slice(0, program.limit);

    /**
     * Clear database
     */
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
        request(link, parseDataNestedNews((error, objPrepared) => {
            if (error) {
                console.log('Error', error);
            }

            mongoUtil
                .getDb()
                .collection('news')
                .insert(objPrepared, function (err, r) {
                    if(err){
                        console.log('Error while saving in mongodb', err);
                        return;
                    }
                    console.log('Successfully saved');
                });
        }))
    }
});

return 0;
