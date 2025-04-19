/**
 * The types of action cards in a `[symbol]: [name]` pairs.\
 * Warning: You shouldn't modify any of existing values.
 * @namespace
 * @type {Object<string|number,string>}
 * @readonly
 * @example
 * // example
 * cardTypes = {
 *   0: 'Zero',
 *   1: 'One',
 *   ...,
 *   r: 'Reverse',
 *   s: 'Skip',
 *   w: 'Wild',
 *   '+2': 'Draw two',
 *   '+4': 'Wild Draw Four'
 * }
 */
export const cardTypes = {
  0: 'Zero',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  r: 'Reverse',
  s: 'Skip',
  w: 'Wild',
  '+2': 'Draw Two',
  '+4': 'Wild Draw Four',
};

/**
 * List of action cards' symbol.\
 * Warning: You shouldn't modify any of existing values.
 * @namespace
 * @type {string[]}
 * @readonly
 * @example
 * actionCards = ['r', 's', 'w', '+3', '+4']
 */
export const actionCards = [
  'r', 's', 'w',
  '+2', '+4',
];
