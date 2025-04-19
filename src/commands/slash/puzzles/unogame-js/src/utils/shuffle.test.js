/* eslint-disable no-console */
import shuffle from './shuffle.js';

const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let array1;
let array2;

console.log(`Original array: ${array}`);

test('array is shuffled', () => {
  array1 = [...array];
  shuffle(array);
  console.log(`Shuffled 1 time: ${array}`);
  expect(array).not.toEqual(array1);
});

test('array is shuffled again', () => {
  array2 = [...array];
  shuffle(array);
  console.log(`Shuffled 2 times: ${array}`);
  expect(array).not.toEqual(array1);
  expect(array).not.toEqual(array2);
});
