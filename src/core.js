/**
 * Detris - Core Module
 *
 * Unicode braille encoding, grid management, and piece definitions.
 *
 * @module detris/core
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // ========================================
  // Constants
  // ========================================

  var BRAILLE_BASE = 0x2800;

  var PALETTE = ['⠀', '⠇', '⠋', '⠏', '⠙', '⠦', '⠧', '⠴', '⠸', '⠹', '⠼'];

  var PALETTE_VALUES = {
    '⠀': 0, '⠇': 7, '⠋': 11, '⠏': 15, '⠙': 25,
    '⠦': 38, '⠧': 39, '⠴': 52, '⠸': 56, '⠹': 57, '⠼': 60
  };

  var PIECE_TYPES = {
    I: 'I', O: 'O', T: 'T', S: 'S', Z: 'Z', J: 'J', L: 'L'
  };

  var PIECE_GLYPHS = {
    I: '⠏', O: '⠴', T: '⠦', S: '⠧', Z: '⠇', J: '⠼', L: '⠸'
  };

  var PIECE_SHAPES = {
    I: [[0,0], [0,1], [0,2], [0,3]],
    O: [[0,0], [0,1], [1,0], [1,1]],
    T: [[0,0], [0,1], [0,2], [1,1]],
    S: [[0,1], [0,2], [1,0], [1,1]],
    Z: [[0,0], [0,1], [1,1], [1,2]],
    J: [[0,0], [1,0], [1,1], [1,2]],
    L: [[0,2], [1,0], [1,1], [1,2]]
  };

  var ACTIONS = {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    DOWN: 'DOWN',
    ROTATE_CW: 'ROTATE_CW',
    ROTATE_CCW: 'ROTATE_CCW',
    DROP: 'DROP',
    HOLD: 'HOLD'
  };

  // ========================================
  // Utilities
  // ========================================

  function generateId(prefix) {
    prefix = prefix || 'id';
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function timestamp() {
    return new Date().toISOString();
  }

  // ========================================
  // EventEmitter
  // ========================================

  function EventEmitter() {
    this._events = {};
  }

  EventEmitter.prototype.on = function(event, listener) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(listener);
    return this;
  };

  EventEmitter.prototype.off = function(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(function(l) {
      return l !== listener;
    });
    return this;
  };

  EventEmitter.prototype.emit = function(event, data) {
    if (!this._events[event]) return;
    this._events[event].forEach(function(listener) {
      listener(data);
    });
  };

  // ========================================
  // Codec
  // ========================================

  function Codec() {}

  Codec.prototype.encodeByte = function(value) {
    return String.fromCharCode(BRAILLE_BASE + (value & 0xFF));
  };

  Codec.prototype.decodeByte = function(glyph) {
    return glyph.charCodeAt(0) - BRAILLE_BASE;
  };

  Codec.prototype.encodePalette = function(index) {
    return PALETTE[index % PALETTE.length];
  };

  Codec.prototype.decodePalette = function(glyph) {
    var idx = PALETTE.indexOf(glyph);
    return idx >= 0 ? idx : 0;
  };

  Codec.prototype.gridToUtf8 = function(grid) {
    return grid.data.map(function(row) {
      return row.join('');
    }).join('\n');
  };

  Codec.prototype.utf8ToGrid = function(str, rows, cols) {
    rows = rows || 10;
    cols = cols || 10;
    var lines = str.split('\n');
    var grid = new Grid(rows, cols);
    for (var r = 0; r < Math.min(lines.length, rows); r++) {
      var chars = Array.from(lines[r]);
      for (var c = 0; c < Math.min(chars.length, cols); c++) {
        grid.set(r, c, chars[c]);
      }
    }
    return grid;
  };

  Codec.prototype.gridToHex = function(grid) {
    var bytes = [];
    for (var r = 0; r < grid.rows; r++) {
      for (var c = 0; c < grid.cols; c++) {
        bytes.push(this.decodeByte(grid.get(r, c)));
      }
    }
    return bytes.map(function(b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  };

  Codec.prototype.hexToGrid = function(hex, rows, cols) {
    rows = rows || 10;
    cols = cols || 10;
    var grid = new Grid(rows, cols);
    var self = this;
    for (var i = 0; i < hex.length; i += 2) {
      var byteVal = parseInt(hex.substr(i, 2), 16);
      var idx = i / 2;
      var r = Math.floor(idx / cols);
      var c = idx % cols;
      if (r < rows && c < cols) {
        grid.set(r, c, self.encodeByte(byteVal));
      }
    }
    return grid;
  };

  Codec.prototype.gridToBase64 = function(grid) {
    var bytes = [];
    for (var r = 0; r < grid.rows; r++) {
      for (var c = 0; c < grid.cols; c++) {
        bytes.push(this.decodeByte(grid.get(r, c)));
      }
    }
    if (typeof btoa !== 'undefined') {
      return btoa(String.fromCharCode.apply(null, bytes));
    }
    return Buffer.from(bytes).toString('base64');
  };

  Codec.prototype.base64ToGrid = function(b64, rows, cols) {
    rows = rows || 10;
    cols = cols || 10;
    var bytes;
    if (typeof atob !== 'undefined') {
      var decoded = atob(b64);
      bytes = [];
      for (var i = 0; i < decoded.length; i++) {
        bytes.push(decoded.charCodeAt(i));
      }
    } else {
      bytes = Array.from(Buffer.from(b64, 'base64'));
    }
    var grid = new Grid(rows, cols);
    var self = this;
    for (var idx = 0; idx < bytes.length; idx++) {
      var r = Math.floor(idx / cols);
      var c = idx % cols;
      if (r < rows && c < cols) {
        grid.set(r, c, self.encodeByte(bytes[idx]));
      }
    }
    return grid;
  };

  // Singleton instance
  Codec.instance = new Codec();

  // ========================================
  // Grid
  // ========================================

  function Grid(rows, cols, initialValue) {
    this.rows = rows || 10;
    this.cols = cols || 10;
    this.data = [];
    initialValue = initialValue || '⠀';

    for (var r = 0; r < this.rows; r++) {
      var row = [];
      for (var c = 0; c < this.cols; c++) {
        row.push(initialValue);
      }
      this.data.push(row);
    }
  }

  Grid.prototype.get = function(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
      return null;
    }
    return this.data[r][c];
  };

  Grid.prototype.set = function(r, c, value) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
      return false;
    }
    this.data[r][c] = value;
    return true;
  };

  Grid.prototype.isOccupied = function(r, c) {
    var cell = this.get(r, c);
    return cell !== null && cell !== '⠀';
  };

  Grid.prototype.isEmpty = function(r, c) {
    return this.get(r, c) === '⠀';
  };

  Grid.prototype.inBounds = function(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  };

  Grid.prototype.clear = function() {
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        this.data[r][c] = '⠀';
      }
    }
    return this;
  };

  Grid.prototype.copy = function() {
    var clone = new Grid(this.rows, this.cols);
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        clone.data[r][c] = this.data[r][c];
      }
    }
    return clone;
  };

  Grid.prototype.equals = function(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) return false;
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        if (this.data[r][c] !== other.data[r][c]) return false;
      }
    }
    return true;
  };

  Grid.prototype.getRow = function(r) {
    if (r < 0 || r >= this.rows) return null;
    return this.data[r].slice();
  };

  Grid.prototype.getCol = function(c) {
    if (c < 0 || c >= this.cols) return null;
    var col = [];
    for (var r = 0; r < this.rows; r++) {
      col.push(this.data[r][c]);
    }
    return col;
  };

  Grid.prototype.isRowFull = function(r) {
    if (r < 0 || r >= this.rows) return false;
    for (var c = 0; c < this.cols; c++) {
      if (this.data[r][c] === '⠀') return false;
    }
    return true;
  };

  Grid.prototype.isRowEmpty = function(r) {
    if (r < 0 || r >= this.rows) return false;
    for (var c = 0; c < this.cols; c++) {
      if (this.data[r][c] !== '⠀') return false;
    }
    return true;
  };

  Grid.prototype.clearRow = function(r) {
    if (r < 0 || r >= this.rows) return;
    for (var c = 0; c < this.cols; c++) {
      this.data[r][c] = '⠀';
    }
  };

  Grid.prototype.countOccupied = function() {
    var count = 0;
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        if (this.data[r][c] !== '⠀') count++;
      }
    }
    return count;
  };

  Grid.prototype.toBytes = function() {
    var codec = Codec.instance;
    var bytes = [];
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        bytes.push(codec.decodeByte(this.data[r][c]));
      }
    }
    return bytes;
  };

  Grid.prototype.toString = function() {
    return Codec.instance.gridToUtf8(this);
  };

  Grid.prototype.toJSON = function() {
    return {
      rows: this.rows,
      cols: this.cols,
      data: this.data.map(function(row) { return row.slice(); })
    };
  };

  Grid.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    var grid = new Grid(json.rows, json.cols);
    grid.data = json.data.map(function(row) { return row.slice(); });
    return grid;
  };

  // ========================================
  // Piece
  // ========================================

  function Piece(type, rotation) {
    this.type = type || PIECE_TYPES.T;
    this.rotation = rotation || 0;
    this.glyph = PIECE_GLYPHS[this.type] || '⠦';
    this.shape = this._computeShape();
  }

  Piece.prototype._computeShape = function() {
    var baseShape = PIECE_SHAPES[this.type] || PIECE_SHAPES.T;
    var rotated = baseShape.map(function(coord) { return coord.slice(); });

    var rotations = (this.rotation / 90) % 4;
    for (var i = 0; i < rotations; i++) {
      rotated = rotated.map(function(coord) {
        return [-coord[1], coord[0]];
      });
    }

    // Normalize to non-negative coordinates
    var minR = Math.min.apply(null, rotated.map(function(c) { return c[0]; }));
    var minC = Math.min.apply(null, rotated.map(function(c) { return c[1]; }));

    return rotated.map(function(coord) {
      return [coord[0] - minR, coord[1] - minC];
    });
  };

  Piece.prototype.rotateCW = function() {
    return new Piece(this.type, (this.rotation + 90) % 360);
  };

  Piece.prototype.rotateCCW = function() {
    return new Piece(this.type, (this.rotation + 270) % 360);
  };

  Piece.prototype.getBounds = function() {
    var minR = Infinity, maxR = -Infinity;
    var minC = Infinity, maxC = -Infinity;
    this.shape.forEach(function(coord) {
      minR = Math.min(minR, coord[0]);
      maxR = Math.max(maxR, coord[0]);
      minC = Math.min(minC, coord[1]);
      maxC = Math.max(maxC, coord[1]);
    });
    return { minR: minR, maxR: maxR, minC: minC, maxC: maxC };
  };

  Piece.prototype.getWidth = function() {
    var bounds = this.getBounds();
    return bounds.maxC - bounds.minC + 1;
  };

  Piece.prototype.getHeight = function() {
    var bounds = this.getBounds();
    return bounds.maxR - bounds.minR + 1;
  };

  Piece.prototype.toJSON = function() {
    return {
      type: this.type,
      rotation: this.rotation,
      glyph: this.glyph,
      shape: this.shape
    };
  };

  Piece.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new Piece(json.type, json.rotation);
  };

  Piece.random = function(rng) {
    var types = Object.keys(PIECE_TYPES);
    var idx = rng ? Math.floor(rng() * types.length) : Math.floor(Math.random() * types.length);
    return new Piece(types[idx]);
  };

  // ========================================
  // Action
  // ========================================

  function Action(type, data) {
    this.type = type;
    this.data = data || {};
    this.timestamp = timestamp();
  }

  Action.prototype.toJSON = function() {
    return {
      type: this.type,
      data: this.data,
      timestamp: this.timestamp
    };
  };

  Action.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    var action = new Action(json.type, json.data);
    action.timestamp = json.timestamp;
    return action;
  };

  // ========================================
  // GameState
  // ========================================

  function GameState(options) {
    options = options || {};
    this.id = options.id || generateId('state');
    this.grid = options.grid || new Grid(20, 10);
    this.currentPiece = options.currentPiece || null;
    this.piecePosition = options.piecePosition || { r: 0, c: 3 };
    this.nextPiece = options.nextPiece || null;
    this.heldPiece = options.heldPiece || null;
    this.score = options.score || 0;
    this.level = options.level || 1;
    this.linesCleared = options.linesCleared || 0;
    this.moveCount = options.moveCount || 0;
    this.seed = options.seed || Date.now();
    this.gameOver = options.gameOver || false;
    this.timestamp = options.timestamp || timestamp();
  }

  GameState.prototype.copy = function() {
    return new GameState({
      id: generateId('state'),
      grid: this.grid.copy(),
      currentPiece: this.currentPiece ? new Piece(this.currentPiece.type, this.currentPiece.rotation) : null,
      piecePosition: { r: this.piecePosition.r, c: this.piecePosition.c },
      nextPiece: this.nextPiece ? new Piece(this.nextPiece.type, this.nextPiece.rotation) : null,
      heldPiece: this.heldPiece ? new Piece(this.heldPiece.type, this.heldPiece.rotation) : null,
      score: this.score,
      level: this.level,
      linesCleared: this.linesCleared,
      moveCount: this.moveCount,
      seed: this.seed,
      gameOver: this.gameOver
    });
  };

  GameState.prototype.toJSON = function() {
    return {
      id: this.id,
      grid: this.grid.toJSON(),
      currentPiece: this.currentPiece ? this.currentPiece.toJSON() : null,
      piecePosition: this.piecePosition,
      nextPiece: this.nextPiece ? this.nextPiece.toJSON() : null,
      heldPiece: this.heldPiece ? this.heldPiece.toJSON() : null,
      score: this.score,
      level: this.level,
      linesCleared: this.linesCleared,
      moveCount: this.moveCount,
      seed: this.seed,
      gameOver: this.gameOver,
      timestamp: this.timestamp
    };
  };

  GameState.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new GameState({
      id: json.id,
      grid: Grid.fromJSON(json.grid),
      currentPiece: json.currentPiece ? Piece.fromJSON(json.currentPiece) : null,
      piecePosition: json.piecePosition,
      nextPiece: json.nextPiece ? Piece.fromJSON(json.nextPiece) : null,
      heldPiece: json.heldPiece ? Piece.fromJSON(json.heldPiece) : null,
      score: json.score,
      level: json.level,
      linesCleared: json.linesCleared,
      moveCount: json.moveCount,
      seed: json.seed,
      gameOver: json.gameOver,
      timestamp: json.timestamp
    });
  };

  // ========================================
  // Module Export
  // ========================================

  var CoreModule = {
    // Constants
    BRAILLE_BASE: BRAILLE_BASE,
    PALETTE: PALETTE,
    PALETTE_VALUES: PALETTE_VALUES,
    PIECE_TYPES: PIECE_TYPES,
    PIECE_GLYPHS: PIECE_GLYPHS,
    PIECE_SHAPES: PIECE_SHAPES,
    ACTIONS: ACTIONS,

    // Utilities
    generateId: generateId,
    timestamp: timestamp,

    // Classes
    EventEmitter: EventEmitter,
    Codec: Codec,
    Grid: Grid,
    Piece: Piece,
    Action: Action,
    GameState: GameState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoreModule;
  } else {
    global.DetrisCore = CoreModule;
  }

})(typeof window !== 'undefined' ? window : this);
