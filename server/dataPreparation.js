function isValidUrl(link) {
  const pattern = new RegExp('^((https?:)?\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locater
  return pattern.test(link);
}

function prepareLocation(data) {
  /**
   * Such strange construction because
   * we need create index in array
   */
  const locationPoint = {
    type: 'Point',
    coordinates: [
      data.geometry.location.lng,
      data.geometry.location.lat,
    ],
  };
  return { locationPoint };
}

/**
 * Full address preparation
 * for debugging
 *
 * @param data
 */
function prepareAddress(data) {
  const addressComponents = {
    city: null,
    region: null,
    country: null,
    location: {
      locationPoint: prepareLocation(data)
    },
  };
  data.address_components.forEach((addressComponent) => {
    switch (addressComponent.types[0]) {
      case 'locality':
        addressComponents.city = addressComponent.long_name;
        break;
      case 'administrative_area_level_2':
        addressComponents.region = addressComponent.long_name;
        break;
      case 'administrative_area_level_1':
        /**
         * Skip if already added region in block bellow
         */
        addressComponents.region = (addressComponents.region !== null) ?
          addressComponents.region :
          addressComponent.long_name;
        break;
      case 'country':
        addressComponents.country = addressComponent.long_name;
        break;
      default:
        break;
    }
  });
  return addressComponents;
}

module.exports = {
  isValidUrl,
  prepareLocation,
  prepareAddress,
};
