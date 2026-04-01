/**
 * Detris - Main Entry Point
 *
 * Unicode-native verifiable computation substrate.
 * Deterministic Tetris for agent learning and communication.
 *
 * @module detris
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // Import modules
  var CoreModule, EngineModule, HashModule, ProofModule, RadialModule;

  if (typeof require !== 'undefined') {
    CoreModule = require('./core');
    EngineModule = require('./engine');
    HashModule = require('./hash');
    ProofModule = require('./proof');
    RadialModule = require('./radial');
  } else {
    CoreModule = global.DetrisCore;
    EngineModule = global.DetrisEngine;
    HashModule = global.DetrisHash;
    ProofModule = global.DetrisProof;
    RadialModule = global.DetrisRadial;
  }

  // ========================================
  // Factory Functions
  // ========================================

  function createGrid(rows, cols) {
    return new CoreModule.Grid(rows, cols);
  }

  function createPiece(type, rotation) {
    return new CoreModule.Piece(type, rotation);
  }

  function createGameState(options) {
    return new CoreModule.GameState(options);
  }

  function createGameEngine(options) {
    return new EngineModule.GameEngine(options);
  }

  function createHashEngine() {
    return new HashModule.HashEngine();
  }

  function createPoPEngine(gameEngine, hashEngine) {
    return new ProofModule.PoPEngine(gameEngine, hashEngine);
  }

  function createPoLEngine(popEngine, options) {
    return new ProofModule.PoLEngine(popEngine, options);
  }

  function createChannel(options) {
    return new RadialModule.AgentChannel(options);
  }

  function createChannelRegistry() {
    return new RadialModule.ChannelRegistry();
  }

  // ========================================
  // DetrisSession - High-Level API
  // ========================================

  function DetrisSession(options) {
    CoreModule.EventEmitter.call(this);

    options = options || {};
    this.id = CoreModule.generateId('session');
    this.seed = options.seed || Date.now();

    // Initialize engines
    this.gameEngine = new EngineModule.GameEngine({ seed: this.seed });
    this.hashEngine = new HashModule.HashEngine();
    this.popEngine = new ProofModule.PoPEngine(this.gameEngine, this.hashEngine);
    this.polEngine = new ProofModule.PoLEngine(this.popEngine, options.scoring);

    // State
    this.state = null;
    this.popChain = new ProofModule.PoPChain(this.hashEngine);
    this.trajectory = [];

    // Event forwarding
    var self = this;
    this.gameEngine.on('init', function(data) { self.emit('gameInit', data); });
    this.gameEngine.on('pieceLocked', function(data) { self.emit('pieceLocked', data); });
    this.gameEngine.on('linesCleared', function(data) { self.emit('linesCleared', data); });
    this.gameEngine.on('gameOver', function(data) { self.emit('gameOver', data); });
  }

  DetrisSession.prototype = Object.create(CoreModule.EventEmitter.prototype);
  DetrisSession.prototype.constructor = DetrisSession;

  DetrisSession.prototype.start = function() {
    this.state = this.gameEngine.init();
    this.trajectory = [this.state.copy()];
    this.popChain = new ProofModule.PoPChain(this.hashEngine);
    this.popChain.initialCommit = this.hashEngine.hashGrid(this.state.grid);

    this.emit('started', { state: this.state });
    return this.state;
  };

  DetrisSession.prototype.action = function(actionType) {
    if (!this.state || this.state.gameOver) {
      return null;
    }

    var action = new CoreModule.Action(actionType);
    var result = this.popEngine.generatePoP(this.state, action);

    this.popChain.append(result.pop);
    this.state = result.stateNext;
    this.trajectory.push(this.state.copy());

    this.emit('actionApplied', { action: action, state: this.state });
    return this.state;
  };

  DetrisSession.prototype.tick = function() {
    return this.action(CoreModule.ACTIONS.DOWN);
  };

  DetrisSession.prototype.getState = function() {
    return this.state;
  };

  DetrisSession.prototype.getRenderedGrid = function(options) {
    if (!this.state) return null;
    return this.gameEngine.renderState(this.state, options);
  };

  DetrisSession.prototype.getProofChain = function() {
    return this.popChain;
  };

  DetrisSession.prototype.verify = function() {
    if (this.trajectory.length === 0) {
      return { valid: true };
    }
    return this.popChain.verify(this.popEngine, this.trajectory[0]);
  };

  DetrisSession.prototype.getRecording = function() {
    return {
      id: this.id,
      seed: this.seed,
      popChain: this.popChain.toJSON(),
      finalState: this.state ? this.state.toJSON() : null,
      moveCount: this.state ? this.state.moveCount : 0,
      score: this.state ? this.state.score : 0
    };
  };

  // ========================================
  // AgentTrainer
  // ========================================

  function AgentTrainer(options) {
    CoreModule.EventEmitter.call(this);

    options = options || {};
    this.polEngine = options.polEngine || new ProofModule.PoLEngine(
      new ProofModule.PoPEngine(
        new EngineModule.GameEngine(),
        new HashModule.HashEngine()
      )
    );
  }

  AgentTrainer.prototype = Object.create(CoreModule.EventEmitter.prototype);
  AgentTrainer.prototype.constructor = AgentTrainer;

  AgentTrainer.prototype.train = function(agentPlayFn, options) {
    options = options || {};
    var seed = options.seed || Date.now();
    var difficulty = options.difficulty || 1.0;
    var attempts = options.attempts || 10;

    var challenge = this.polEngine.generateChallenge(seed, difficulty);
    this.emit('challengeGenerated', { challenge: challenge });

    var pol = this.polEngine.generatePoL(agentPlayFn, challenge, attempts);
    this.emit('trainingComplete', { pol: pol });

    return pol;
  };

  AgentTrainer.prototype.verify = function(pol) {
    return this.polEngine.verifyPoL(pol);
  };

  // ========================================
  // Benchmark
  // ========================================

  function Benchmark(options) {
    options = options || {};
    this.runs = options.runs || 100;
    this.warmup = options.warmup || 10;
  }

  Benchmark.prototype.runGamePerformance = function() {
    var engine = new EngineModule.GameEngine();
    var results = [];

    // Warmup
    for (var w = 0; w < this.warmup; w++) {
      var warmupState = engine.init();
      for (var i = 0; i < 50; i++) {
        engine.tick(warmupState);
      }
    }

    // Benchmark
    for (var r = 0; r < this.runs; r++) {
      var start = Date.now();
      var state = engine.init();
      var moves = 0;

      while (!state.gameOver && moves < 500) {
        var legal = engine.getLegalActions(state);
        if (legal.length > 0) {
          var action = legal[Math.floor(Math.random() * legal.length)];
          var result = engine.applyAction(state, action);
          if (result) state = result;
        }
        state = engine.tick(state);
        moves++;
      }

      var elapsed = Date.now() - start;
      results.push({
        moves: moves,
        score: state.score,
        lines: state.linesCleared,
        elapsed: elapsed,
        movesPerSecond: (moves / elapsed) * 1000
      });
    }

    // Aggregate
    var totalMoves = results.reduce(function(sum, r) { return sum + r.moves; }, 0);
    var totalElapsed = results.reduce(function(sum, r) { return sum + r.elapsed; }, 0);
    var avgScore = results.reduce(function(sum, r) { return sum + r.score; }, 0) / this.runs;

    return {
      runs: this.runs,
      avgMovesPerSecond: (totalMoves / totalElapsed) * 1000,
      avgScore: avgScore,
      avgMoves: totalMoves / this.runs,
      results: results
    };
  };

  Benchmark.prototype.runHashPerformance = function() {
    var hashEngine = new HashModule.HashEngine();
    var grid = new CoreModule.Grid(20, 10);

    // Fill grid with random data
    for (var r = 0; r < grid.rows; r++) {
      for (var c = 0; c < grid.cols; c++) {
        grid.set(r, c, CoreModule.PALETTE[Math.floor(Math.random() * CoreModule.PALETTE.length)]);
      }
    }

    // Benchmark hashing
    var start = Date.now();
    for (var i = 0; i < this.runs * 100; i++) {
      hashEngine.hashGrid(grid);
    }
    var elapsed = Date.now() - start;

    return {
      operations: this.runs * 100,
      elapsed: elapsed,
      hashesPerSecond: (this.runs * 100 / elapsed) * 1000
    };
  };

  Benchmark.prototype.runProofPerformance = function() {
    var gameEngine = new EngineModule.GameEngine();
    var hashEngine = new HashModule.HashEngine();
    var popEngine = new ProofModule.PoPEngine(gameEngine, hashEngine);

    var results = [];

    for (var r = 0; r < this.runs; r++) {
      var state = gameEngine.init();
      var popCount = 0;
      var start = Date.now();

      while (!state.gameOver && popCount < 100) {
        var legal = gameEngine.getLegalActions(state);
        if (legal.length > 0) {
          var action = legal[Math.floor(Math.random() * legal.length)];
          try {
            var result = popEngine.generatePoP(state, action);
            state = result.stateNext;
            popCount++;
          } catch (e) {
            break;
          }
        }
        state = gameEngine.tick(state);
      }

      var elapsed = Date.now() - start;
      results.push({
        pops: popCount,
        elapsed: elapsed,
        popsPerSecond: (popCount / elapsed) * 1000
      });
    }

    var totalPops = results.reduce(function(sum, r) { return sum + r.pops; }, 0);
    var totalElapsed = results.reduce(function(sum, r) { return sum + r.elapsed; }, 0);

    return {
      runs: this.runs,
      avgPopsPerSecond: (totalPops / totalElapsed) * 1000,
      totalPops: totalPops,
      results: results
    };
  };

  // ========================================
  // Module Export
  // ========================================

  var Detris = {
    // Constants
    PALETTE: CoreModule.PALETTE,
    PALETTE_VALUES: CoreModule.PALETTE_VALUES,
    PIECE_TYPES: CoreModule.PIECE_TYPES,
    PIECE_GLYPHS: CoreModule.PIECE_GLYPHS,
    ACTIONS: CoreModule.ACTIONS,
    ZONE_TYPES: RadialModule.ZONE_TYPES,

    // Core
    EventEmitter: CoreModule.EventEmitter,
    Codec: CoreModule.Codec,
    Grid: CoreModule.Grid,
    Piece: CoreModule.Piece,
    Action: CoreModule.Action,
    GameState: CoreModule.GameState,

    // Engine
    SeededRNG: EngineModule.SeededRNG,
    PieceBag: EngineModule.PieceBag,
    GameEngine: EngineModule.GameEngine,
    ReplayEngine: EngineModule.ReplayEngine,

    // Hash
    sha256: HashModule.sha256,
    HashEngine: HashModule.HashEngine,
    MerkleTree: HashModule.MerkleTree,
    GridMerkleTree: HashModule.GridMerkleTree,
    Commitment: HashModule.Commitment,
    HashChain: HashModule.HashChain,

    // Proof
    Witness: ProofModule.Witness,
    PoP: ProofModule.PoP,
    PoPEngine: ProofModule.PoPEngine,
    PoPChain: ProofModule.PoPChain,
    Challenge: ProofModule.Challenge,
    PoL: ProofModule.PoL,
    PoLEngine: ProofModule.PoLEngine,

    // Radial
    RadialZone: RadialModule.RadialZone,
    ZoneLayout: RadialModule.ZoneLayout,
    AgentChannel: RadialModule.AgentChannel,
    ChannelRegistry: RadialModule.ChannelRegistry,
    GridPayload: RadialModule.GridPayload,

    // High-Level
    DetrisSession: DetrisSession,
    AgentTrainer: AgentTrainer,
    Benchmark: Benchmark,

    // Factory Functions
    createGrid: createGrid,
    createPiece: createPiece,
    createGameState: createGameState,
    createGameEngine: createGameEngine,
    createHashEngine: createHashEngine,
    createPoPEngine: createPoPEngine,
    createPoLEngine: createPoLEngine,
    createChannel: createChannel,
    createChannelRegistry: createChannelRegistry,

    // Quick builders
    session: function(options) {
      return new DetrisSession(options);
    },

    trainer: function(options) {
      return new AgentTrainer(options);
    },

    benchmark: function(options) {
      return new Benchmark(options);
    },

    // Sub-modules
    CoreModule: CoreModule,
    EngineModule: EngineModule,
    HashModule: HashModule,
    ProofModule: ProofModule,
    RadialModule: RadialModule,

    // Utilities
    generateId: CoreModule.generateId,
    timestamp: CoreModule.timestamp,

    // Version
    version: '1.0.0'
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Detris;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return Detris; });
  } else {
    global.Detris = Detris;
  }

})(typeof window !== 'undefined' ? window : this);
