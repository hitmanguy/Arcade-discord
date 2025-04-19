// UNFINISHED

/* eslint-disable no-shadow */
import Card from './Card.js';
import Game from './Game.js';

const players = ['Player 1', 'Player 2', 'Player 3'];
/** @type {Game} */
let game;

describe('Game', () => {
  describe('#constructor', () => {
    test('error duplicate player', () => {
      expect(() => new Game(['P1', 'P1']))
        .toThrow(/Cannot have duplicate players' name/);
    });

    test.each([
      ['< 2', ['P1']],
      ['> 10', '0123456789a'.split('')],
    ])('error players %s', (desc, players) => {
      expect(() => new Game(players))
        .toThrow(/Too (few|much) players/);
    });

    test('create a new game', () => {
      expect(game = new Game(players)).toBeInstanceOf(Game);
    });
  });

  describe('#newRound', () => {
    test('error starting player index not in range', () => {
      expect(() => game.newRound(3)).toThrow(/Must be in the range/i);
      expect(() => game.newRound(-1)).toThrow(/Must be in the range/i);
    });

    test('create a new round', () => {
      game.newRound();
      expect(game.roundConfig).not.toBeNull();
    });

    describe('.players', () => {
      test('checks reference (clone of Game#players)', () => {
        expect(game.roundConfig.players).not.toBe(game.players);
      });
    });
  });

  describe('#drawPile', () => {
    test('checks reference', () => {
      expect(game.drawPile).toStrictEqual(game.roundConfig.drawPile);
    });
  });

  describe('#discardPile', () => {
    test('checks reference', () => {
      expect(game.discardPile).toStrictEqual(game.roundConfig.discardPile);
    });
  });

  describe('#getPlayerCards', () => {
    test('error `player` out of range', () => {
      expect(() => game.getPlayerCards(3)).toThrow(/No player found/);
      expect(() => game.getPlayerCards(-1)).toThrow(/No player found/);
    });

    test('checks reference', () => {
      expect(game.getPlayerCards(2))
        .toStrictEqual(game.roundConfig.playersCards[2]);
    });
  });

  describe('#getPlayerCardsByName', () => {
    test('error `player` out of range', () => {
      expect(() => game.getPlayerCardsByName('Anonymous'))
        .toThrow(/No player found/);
    });

    test('checks reference', () => {
      expect(game.getPlayerCardsByName('Player 1'))
        .toStrictEqual(game.getPlayerCards(0));
    });
  });

  describe('#isPlayable', () => {
    beforeAll(() => {
      game.discardPile.push(new Card('green', '1'));
    });

    const unplayableCards = [
      new Card('red', 's'),
      new Card('yellow', '3'),
      new Card('blue', '+2'),
    ];

    const playableCards = [
      new Card('green', 'r'),
      new Card('blue', '1'),
      new Card('green', '1'),
      new Card('wild', 'w'),
    ];

    test('checks playable cards among an array', () => {
      expect(game
        .isPlayable(unplayableCards.concat(playableCards)))
        .toEqual(Array(3).fill(false).concat(playableCards));
    });

    test.each(
      unplayableCards,
    )('%s is unplayable against Green One Card', (card) => {
      expect(game.isPlayable(card)).toBeFalsy();
    });

    test.each(
      playableCards,
    )('%s is playable against Green One Card', (card) => {
      expect(game.isPlayable(card)).toBeTruthy();
    });
  });

  // TODO: #draw
  describe('#draw', () => {

  });

  // TODO: #play
  describe('#play', () => {
    test('Prevent jump-in', () => {

    });
  });

  // TODO: #callUno

  // TODO: #endTurn

  describe('roundConfig-dependant methods/getters availability error', () => {
    const game = new Game(players);
    test.each([
      'drawPile',
      'discardPile',
    ])('#%s', (prop) => {
      expect(() => game[prop]).toThrow(/No available round found/);
    });

    test.each([
      'getPlayerCards',
      'getPlayerCardsByName',
      'draw',
      'play',
      'isPlayable',
      'callUno',
      'endTurn',
    ])('#%s()', (prop) => {
      expect(() => game[prop]()).toThrow(/No available round found/);
    });
  });
});
