import titleize from 'titleize';
import { actionCards, cardTypes } from '../namespaces/cardTypes.js';

/**
 * UNO card class.
 */
export default class Card {
  /**
   * Creates a new UNO Card.
   * @param {string} color - The color of the card.
   *    Either `red`, `yellow`, `green`, `blue`, or `wild`.
   * @param {string} symbol - The number (in `string`) or symbol of the card.
   *    Check {@link cardTypes} for lists of valid symbols and its name.
   */
  constructor(color, symbol) {
    let Color = color.toLowerCase();
    const Symbol = symbol.toLowerCase();

    // Automatically change the `color` to `wild` if its a wild card.
    if (['w', '+4'].includes(Symbol)) Color = 'wild';
    else if (Color === 'wild') {
      throw new Error(`${cardTypes[Symbol]} Card cannot have \`wild\` color`);
    }

    if (!'red,yellow,green,blue,wild'.split(',').includes(Color)) {
      throw new RangeError(
        'Invalid color value. '
        + 'Must be either `red`, `yellow`. `green`, `blue`, or `wild`',
      );
    }

    /**
     * The color of the card.
     * @type {string}
     */
    this.color = Color;

    /**
     * The number (in `string`) or symbol of the card.
     * @type {string}
     */
    this.symbol = Symbol;

    if (Symbol.length === 1 && !Number.isNaN(parseInt(Symbol, 10))) {
      /**
       * The number of the card. An alias for {@link Symbol}
       *    properties if the card is a number card.
       * @type {number}
       */
      this.number = parseInt(Symbol, 10);
    }

    /**
     * The name of the card.
     * @type {string}
     */
    this.name = titleize(
      `${Color === 'wild' ? '' : Color} ${cardTypes[Symbol]} Card`,
    ).trim();

    // Define the points for each type of cards.
    /**
     * The points of the card.
     * @type {number}
     */
    this.points = 0;
    if (actionCards.includes(Symbol)) {
      if (['w', '+4'].includes(Symbol)) this.points = 50;
      else this.points = 20;
    } else this.points = parseInt(Symbol, 10);
  }

  /**
   * Returns the name of the class.
   * @returns {string}
   */
  static toString() {
    return '<class Card>';
  }

  /**
   * Returns a string representation of UNO Card.
   * @returns {string}
   */
  toString() {
    return this.name;
  }
}
