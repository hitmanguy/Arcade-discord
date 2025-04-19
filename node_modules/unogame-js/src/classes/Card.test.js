import Card from './Card.js';

describe('Card', () => {
  describe('#constructor', () => {
    describe('checks invalid color cards', () => {
      test.each([
        'Black',
        'Colorful',
        'Purple',
      ])('`%s` color is invalid', (color) => {
        expect(() => new Card(color, '1')).toThrow(/invalid color/i);
      });
    });

    describe('checks wild card', () => {
      test.each([
        ['Wild Draw Four', '+4'],
        ['Wild', 'w'],
      ])('%s card has `wild` color', (name, symbol) => {
        expect(new Card('blue', symbol).color).toBe('wild');
      });
    });

    describe('prevent `wild` color for regular cards', () => {
      test.each([
        ['Number One', '1'],
        ['Reverse', 'r'],
        ['Skip', 's'],
        ['Draw two', '+2'],
      ])('`%s` cards cannot be `wild`', (name, symbol) => {
        expect(() => new Card('wild', symbol))
          .toThrow(/Card cannot have `wild` color/i);
      });
    });
  });

  describe('#points', () => {
    ([
      'Zero', 'One', 'Two', 'Three', 'Four',
      'Five', 'Six', 'Seven', 'Eight', 'Nine',
    ]).forEach((name, n) => {
      test(`Number ${name} card has ${n} points`, () => {
        expect(new Card('yellow', `${n}`)).toHaveProperty('points', n);
      });
    });

    test.each([
      ['Reverse', 20, 'r'],
      ['Skip', 20, 's'],
      ['Draw Two', 20, '+2'],
      ['Wild', 50, 'w'],
      ['Wild Draw Four', 50, '+4'],
    ])('%s card has %d points', (name, points, symbol) => {
      expect(new Card('blue', symbol)).toHaveProperty('points', points);
    });
  });

  describe('#toString', () => {
    test.each([
      ['0', 'Green Zero Card'],
      ['r', 'Green Reverse Card'],
      ['s', 'Green Skip Card'],
      ['w', 'Wild Card'],
      ['+2', 'Green Draw Two Card'],
      ['+4', 'Wild Draw Four Card'],
    ])('`%s` card has %s name', (symbol, name) => {
      expect(new Card('green', symbol).toString()).toBe(name);
    });
  });

  describe('.toString', () => {
    test('class Card string representation', () => {
      expect(`${Card}`).toBe('<class Card>');
    });
  });
});
