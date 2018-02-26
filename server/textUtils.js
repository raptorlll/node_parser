/**
 * Split content into words
 * @param content
 * @returns {Array}
 */
/**
 * Map reduce
 */
function mapFunction() {
  const getWordsFromText = content => content.toLowerCase()
    .replace(/[\r\n.,!?]|[^A-Za-zА-Яа-яЁё\s]|[0-9]/g, '')
    .replace(/\s\s+/g, ' ')
    .split(/[\s,]+/);
  /**
   * First replace line breaks
   * and replace multiple
   * Suggest that there are wrong formatting
   * so first split by whitespace
   * and after
   * todo: better line clearing
   */
  if (!this.content) {
    return;
  }

  getWordsFromText(this.content).forEach((word) => {
    emit(word, 1);
  });
}

/**
 * @param key
 * @param wordsCount
 * @returns {*}
 */
function reduceFunction(key, wordsCount) {
  return Array.sum(wordsCount);
}

module.exports = {
  mapFunction,
  reduceFunction,
};
