const request = require('request');
/**
 * @param Array townsList
 */
const townsList = require('./towns/list');
const cheerio = require('cheerio');
let { isValidUrl, prepareLocation, prepareAddress } = require('./dataPreparation');


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

function getMainPageLinks(url, limit) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) {
                reject(error);
            }
            const $ = cheerio.load(body);
            resolve($('a[href][data-hint-source]').filter((index, element) => {
                let link = element.attribs.href;
                if (!isValidUrl(link))
                    return false;

                return true;
            }).map((index, element) => {
                return element.attribs.href;
            }).slice(0, limit));
        });
    });
}

function getInnerPagesData(url) {
    return new Promise((resolve, reject) => {
        request(url, parseDataNestedNews((error, objPrepared) => {
            if (error) {
                reject(error);
            }
            resolve(objPrepared);
        }))
    });
}

module.exports = {
    getMainPageLinks,
    getInnerPagesData
};