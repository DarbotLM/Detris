/**
 * Detris - Game Engine
 *
 * Tetris game rules, moves, collision detection, and line clearing.
 *
 * @module detris/engine
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // Import core module
  var CoreModule;
  if (typeof require !== 'undefined') {
    CoreModule = require('./core');
  } else {
    CoreModule = global.DetrisCore;
  }

  var Grid = CoreModule.Grid;
  var Piece = CoreModule.Piece;
  var Action = CoreModule.Action;
  var GameState = CoreModule.GameState;
  var EventEmitter = CoreModule.EventEmitter;
  var ACTIONS = CoreModule.ACTIONS;
  var PIECE_TYPES = CoreModule.PIECE_TYPES;
  var generateId = CoreModule.generateId;

  // ========================================
  // Seeded Random Number Generator
  // ========================================

  function SeededRNG(seed) {
    this.seed = seed || Date.now();
    this._state = this.seed;
  }

  SeededRNG.prototype.next = function() {
    // Mulberry32 algorithm
    var t = this._state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  SeededRNG.prototype.nextInt = function(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  };

  SeededRNG.prototype.choice = function(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  };

  // ========================================
  // PieceBag (7-bag randomizer)
  // ========================================

  function PieceBag(rng) {
    this.rng = rng;
    this.bag = [];
    this._refill();
  }

  PieceBag.prototype._refill = function() {
    var types = Object.keys(PIECE_TYPES);
    this.bag = types.slice();
    // Fisher-Yates shuffle
    for (var i = this.bag.length - 1; i > 0; i--) {
      var j = Math.floor(this.rng.next() * (i + 1));
      var temp = this.bag[i];
      this.bag[i] = this.bag[j];
      this.bag[j] = temp;
    }
  };

  PieceBag.prototype.next = function() {
    if (this.bag.length === 0) {
      this._refill();
    }
    return new Piece(this.bag.pop());
  };

  // ========================================
  // GameEngine
  // ========================================

  function GameEngine(options) {
    EventEmitter.call(this);

    options = options || {};
    this.rows = options.rows || 20;
    this.cols = options.cols || 10;
    this.seed = options.seed || Date.now();
    this.rng = new SeededRNG(this.seed);
    this.bag = new PieceBag(this.rng);

    // Scoring
    this.scorePerLine = options.scorePerLine || [0, 100, 300, 500, 800];
    this.softDropScore = options.softDropScore || 1;
    this.hardDropScore = options.hardDropScore || 2;

    // State
    this.state = null;
  }

  GameEngine.prototype = Object.create(EventEmitter.prototype);
  GameEngine.prototype.constructor = GameEngine;

  // Initialize new game
  GameEngine.prototype.init = function() {
    this.rng = new SeededRNG(this.seed);
    this.bag = new PieceBag(this.rng);

    this.state = new GameState({
      grid: new Grid(this.rows, this.cols),
      seed: this.seed
    });

    this.state.currentPiece = this.bag.next();
    this.state.nextPiece = this.bag.next();
    this.state.piecePosition = this._getSpawnPosition(this.state.currentPiece);

    this.emit('init', { state: this.state });
    return this.state;
  };

  GameEngine.prototype._getSpawnPosition = function(piece) {
    var bounds = piece.getBounds();
    return {
      r: 0,
      c: Math.floor((this.cols - piece.getWidth()) / 2) - bounds.minC
    };
  };

  // Check collision
  GameEngine.prototype.checkCollision = function(state, piece, position) {
    var grid = state.grid;
    for (var i = 0; i < piece.shape.length; i++) {
      var coord = piece.shape[i];
      var r = position.r + coord[0];
      var c = position.c + coord[1];

      if (!grid.inBounds(r, c)) return true;
      if (grid.isOccupied(r, c)) return true;
    }
    return false;
  };

  // Lock piece into grid
  GameEngine.prototype.lockPiece = function(state) {
    var piece = state.currentPiece;
    var pos = state.piecePosition;

    for (var i = 0; i < piece.shape.length; i++) {
      var coord = piece.shape[i];
      var r = pos.r + coord[0];
      var c = pos.c + coord[1];
      state.grid.set(r, c, piece.glyph);
    }

    this.emit('pieceLocked', { piece: piece, position: pos });
  };

  // Clear full lines
  GameEngine.prototype.clearLines = function(state) {
    var cleared = [];

    for (var r = state.grid.rows - 1; r >= 0; r--) {
      if (state.grid.isRowFull(r)) {
        cleared.push(r);
      }
    }

    if (cleared.length === 0) return cleared;

    // Remove cleared rows and shift down
    cleared.sort(function(a, b) { return b - a; }); // Descending

    for (var i = 0; i < cleared.length; i++) {
      var rowIdx = cleared[i];
      // Shift all rows above down
      for (var row = rowIdx; row > 0; row--) {
        for (var c = 0; c < state.grid.cols; c++) {
          state.grid.set(row, c, state.grid.get(row - 1, c));
        }
      }
      // Clear top row
      state.grid.clearRow(0);
    }

    // Update score
    var lines = cleared.length;
    state.linesCleared += lines;
    state.score += this.scorePerLine[Math.min(lines, this.scorePerLine.length - 1)] * state.level;

    // Level up every 10 lines
    state.level = Math.floor(state.linesCleared / 10) + 1;

    this.emit('linesCleared', { lines: cleared, count: lines });
    return cleared;
  };

  // Spawn next piece
  GameEngine.prototype.spawnPiece = function(state) {
    state.currentPiece = state.nextPiece;
    state.nextPiece = this.bag.next();
    state.piecePosition = this._getSpawnPosition(state.currentPiece);

    // Check game over
    if (this.checkCollision(state, state.currentPiece, state.piecePosition)) {
      state.gameOver = true;
      this.emit('gameOver', { state: state });
      return false;
    }

    this.emit('pieceSpawned', { piece: state.currentPiece });
    return true;
  };

  // Apply action
  GameEngine.prototype.applyAction = function(state, action) {
    if (state.gameOver) return null;

    var newState = state.copy();
    newState.moveCount++;

    switch (action.type) {
      case ACTIONS.LEFT:
        return this._moveHorizontal(newState, -1);

      case ACTIONS.RIGHT:
        return this._moveHorizontal(newState, 1);

      case ACTIONS.DOWN:
        return this._moveDown(newState, false);

      case ACTIONS.DROP:
        return this._hardDrop(newState);

      case ACTIONS.ROTATE_CW:
        return this._rotate(newState, true);

      case ACTIONS.ROTATE_CCW:
        return this._rotate(newState, false);

      case ACTIONS.HOLD:
        return this._hold(newState);

      default:
        return null;
    }
  };

  GameEngine.prototype._moveHorizontal = function(state, delta) {
    var newPos = { r: state.piecePosition.r, c: state.piecePosition.c + delta };

    if (!this.checkCollision(state, state.currentPiece, newPos)) {
      state.piecePosition = newPos;
      this.emit('pieceMoved', { direction: delta > 0 ? 'right' : 'left' });
      return state;
    }
    return null;
  };

  GameEngine.prototype._moveDown = function(state, softDrop) {
    var newPos = { r: state.piecePosition.r + 1, c: state.piecePosition.c };

    if (!this.checkCollision(state, state.currentPiece, newPos)) {
      state.piecePosition = newPos;
      if (softDrop) {
        state.score += this.softDropScore;
      }
      this.emit('pieceMoved', { direction: 'down' });
      return state;
    }

    // Lock piece
    this.lockPiece(state);
    this.clearLines(state);
    this.spawnPiece(state);
    return state;
  };

  GameEngine.prototype._hardDrop = function(state) {
    var dropDistance = 0;
    var newPos = { r: state.piecePosition.r, c: state.piecePosition.c };

    while (!this.checkCollision(state, state.currentPiece, { r: newPos.r + 1, c: newPos.c })) {
      newPos.r++;
      dropDistance++;
    }

    state.piecePosition = newPos;
    state.score += dropDistance * this.hardDropScore;

    this.lockPiece(state);
    this.clearLines(state);
    this.spawnPiece(state);

    this.emit('hardDrop', { distance: dropDistance });
    return state;
  };

  GameEngine.prototype._rotate = function(state, clockwise) {
    var rotated = clockwise ? state.currentPiece.rotateCW() : state.currentPiece.rotateCCW();

    // Try basic rotation
    if (!this.checkCollision(state, rotated, state.piecePosition)) {
      state.currentPiece = rotated;
      this.emit('pieceRotated', { clockwise: clockwise });
      return state;
    }

    // Wall kick attempts
    var kicks = [
      { r: 0, c: -1 }, { r: 0, c: 1 }, { r: 0, c: -2 }, { r: 0, c: 2 },
      { r: -1, c: 0 }, { r: -1, c: -1 }, { r: -1, c: 1 },
      { r: -2, c: 0 }
    ];

    for (var i = 0; i < kicks.length; i++) {
      var kick = kicks[i];
      var newPos = {
        r: state.piecePosition.r + kick.r,
        c: state.piecePosition.c + kick.c
      };
      if (!this.checkCollision(state, rotated, newPos)) {
        state.currentPiece = rotated;
        state.piecePosition = newPos;
        this.emit('pieceRotated', { clockwise: clockwise, kick: kick });
        return state;
      }
    }

    return null; // Rotation failed
  };

  GameEngine.prototype._hold = function(state) {
    if (state.heldPiece === null) {
      state.heldPiece = new Piece(state.currentPiece.type);
      state.currentPiece = state.nextPiece;
      state.nextPiece = this.bag.next();
    } else {
      var temp = state.heldPiece;
      state.heldPiece = new Piece(state.currentPiece.type);
      state.currentPiece = temp;
    }

    state.piecePosition = this._getSpawnPosition(state.currentPiece);

    if (this.checkCollision(state, state.currentPiece, state.piecePosition)) {
      state.gameOver = true;
      this.emit('gameOver', { state: state });
      return state;
    }

    this.emit('pieceHeld', { held: state.heldPiece });
    return state;
  };

  // Gravity tick
  GameEngine.prototype.tick = function(state) {
    if (state.gameOver) return state;
    return this._moveDown(state.copy(), false) || state;
  };

  // Get ghost piece position
  GameEngine.prototype.getGhostPosition = function(state) {
    var ghostPos = { r: state.piecePosition.r, c: state.piecePosition.c };

    while (!this.checkCollision(state, state.currentPiece, { r: ghostPos.r + 1, c: ghostPos.c })) {
      ghostPos.r++;
    }

    return ghostPos;
  };

  // Render grid with current piece
  GameEngine.prototype.renderState = function(state, options) {
    options = options || {};
    var grid = state.grid.copy();
    var piece = state.currentPiece;
    var pos = state.piecePosition;

    // Render ghost piece
    if (options.showGhost) {
      var ghostPos = this.getGhostPosition(state);
      for (var i = 0; i < piece.shape.length; i++) {
        var coord = piece.shape[i];
        var r = ghostPos.r + coord[0];
        var c = ghostPos.c + coord[1];
        if (grid.inBounds(r, c) && grid.isEmpty(r, c)) {
          grid.set(r, c, '⠙'); // Ghost glyph
        }
      }
    }

    // Render current piece
    for (var j = 0; j < piece.shape.length; j++) {
      var coord2 = piece.shape[j];
      var r2 = pos.r + coord2[0];
      var c2 = pos.c + coord2[1];
      if (grid.inBounds(r2, c2)) {
        grid.set(r2, c2, piece.glyph);
      }
    }

    return grid;
  };

  // Get legal actions
  GameEngine.prototype.getLegalActions = function(state) {
    var legal = [];
    var self = this;

    Object.keys(ACTIONS).forEach(function(key) {
      var action = new Action(ACTIONS[key]);
      var result = self.applyAction(state, action);
      if (result !== null) {
        legal.push(action);
      }
    });

    return legal;
  };

  // ========================================
  // ReplayEngine
  // ========================================

  function ReplayEngine(gameEngine) {
    this.gameEngine = gameEngine;
  }

  ReplayEngine.prototype.record = function(initialState, actions) {
    return {
      id: generateId('replay'),
      seed: initialState.seed,
      initialState: initialState.toJSON(),
      actions: actions.map(function(a) { return a.toJSON(); }),
      timestamp: CoreModule.timestamp()
    };
  };

  ReplayEngine.prototype.replay = function(recording) {
    var actions = recording.actions.map(function(a) { return Action.fromJSON(a); });

    // Reinitialize engine with same seed
    this.gameEngine.seed = recording.seed;
    var state = this.gameEngine.init();

    var trajectory = [state.copy()];

    for (var i = 0; i < actions.length; i++) {
      var result = this.gameEngine.applyAction(state, actions[i]);
      if (result) {
        state = result;
        trajectory.push(state.copy());
      }
    }

    return {
      finalState: state,
      trajectory: trajectory,
      actionCount: actions.length
    };
  };

  ReplayEngine.prototype.verify = function(recording, expectedFinalState) {
    var result = this.replay(recording);
    return result.finalState.grid.equals(expectedFinalState.grid);
  };

  // ========================================
  // Module Export
  // ========================================

  var EngineModule = {
    SeededRNG: SeededRNG,
    PieceBag: PieceBag,
    GameEngine: GameEngine,
    ReplayEngine: ReplayEngine
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineModule;
  } else {
    global.DetrisEngine = EngineModule;
  }

})(typeof window !== 'undefined' ? window : this);
