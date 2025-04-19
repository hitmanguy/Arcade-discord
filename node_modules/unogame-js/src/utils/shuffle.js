/**
 * Shuffle the given array using Fisher-Yates algoritm.\
 * Returns the shuffled array.
 * @param {any[]} array - The array to be shuffled
 * @returns {any[]}
 * @memberof module:utils
 */
export default function shuffle(array) {
  const result = array;
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    [result[currentIndex], result[randomIndex]] = [
      result[randomIndex], result[currentIndex]];
  }

  return result;
}
