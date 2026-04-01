/**
 * Detris - Proof Systems
 *
 * Proof-of-Placement (PoP) and Proof-of-Learning (PoL) engines.
 *
 * @module detris/proof
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // Import modules
  var CoreModule, EngineModule, HashModule;
  if (typeof require !== 'undefined') {
    CoreModule = require('./core');
    EngineModule = require('./engine');
    HashModule = require('./hash');
  } else {
    CoreModule = global.DetrisCore;
    EngineModule = global.DetrisEngine;
    HashModule = global.DetrisHash;
  }

  var Grid = CoreModule.Grid;
  var Action = CoreModule.Action;
  var GameState = CoreModule.GameState;
  var EventEmitter = CoreModule.EventEmitter;
  var generateId = CoreModule.generateId;
  var timestamp = CoreModule.timestamp;

  var GameEngine = EngineModule.GameEngine;
  var SeededRNG = EngineModule.SeededRNG;

  var HashEngine = HashModule.HashEngine;
  var HashChain = HashModule.HashChain;
  var MerkleTree = HashModule.MerkleTree;

  // ========================================
  // Witness
  // ========================================

  function Witness(options) {
    options = options || {};
    this.changedCells = options.changedCells || [];
    this.clearedLines = options.clearedLines || [];
    this.pieceType = options.pieceType || null;
    this.piecePosition = options.piecePosition || null;
    this.scoreChange = options.scoreChange || 0;
  }

  Witness.prototype.toJSON = function() {
    return {
      changedCells: this.changedCells,
      clearedLines: this.clearedLines,
      pieceType: this.pieceType,
      piecePosition: this.piecePosition,
      scoreChange: this.scoreChange
    };
  };

  Witness.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new Witness(json);
  };

  // ========================================
  // PoP (Proof-of-Placement)
  // ========================================

  function PoP(options) {
    options = options || {};
    this.id = options.id || generateId('pop');
    this.prevCommit = options.prevCommit || null;
    this.action = options.action || null;
    this.nextCommit = options.nextCommit || null;
    this.witness = options.witness || null;
    this.signature = options.signature || null;
    this.timestamp = options.timestamp || timestamp();
  }

  PoP.prototype.toJSON = function() {
    return {
      id: this.id,
      prevCommit: this.prevCommit,
      action: this.action ? this.action.toJSON() : null,
      nextCommit: this.nextCommit,
      witness: this.witness ? this.witness.toJSON() : null,
      signature: this.signature,
      timestamp: this.timestamp
    };
  };

  PoP.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new PoP({
      id: json.id,
      prevCommit: json.prevCommit,
      action: json.action ? Action.fromJSON(json.action) : null,
      nextCommit: json.nextCommit,
      witness: json.witness ? Witness.fromJSON(json.witness) : null,
      signature: json.signature,
      timestamp: json.timestamp
    });
  };

  // ========================================
  // PoPEngine
  // ========================================

  function PoPEngine(gameEngine, hashEngine) {
    EventEmitter.call(this);
    this.gameEngine = gameEngine || new GameEngine();
    this.hashEngine = hashEngine || new HashEngine();
  }

  PoPEngine.prototype = Object.create(EventEmitter.prototype);
  PoPEngine.prototype.constructor = PoPEngine;

  PoPEngine.prototype.generatePoP = function(statePrev, action, signFn) {
    var prevCommit = this.hashEngine.hashGrid(statePrev.grid);

    // Apply action
    var stateNext = this.gameEngine.applyAction(statePrev, action);
    if (!stateNext) {
      throw new Error('Invalid action');
    }

    var nextCommit = this.hashEngine.hashGrid(stateNext.grid);

    // Extract witness
    var witness = this._extractWitness(statePrev, stateNext, action);

    var pop = new PoP({
      prevCommit: prevCommit,
      action: action,
      nextCommit: nextCommit,
      witness: witness
    });

    // Sign if function provided
    if (signFn) {
      var message = prevCommit + '||' + action.type + '||' + nextCommit;
      pop.signature = signFn(message);
    }

    this.emit('popGenerated', { pop: pop });
    return { pop: pop, stateNext: stateNext };
  };

  PoPEngine.prototype._extractWitness = function(statePrev, stateNext, action) {
    var changedCells = [];

    for (var r = 0; r < statePrev.grid.rows; r++) {
      for (var c = 0; c < statePrev.grid.cols; c++) {
        var prev = statePrev.grid.get(r, c);
        var next = stateNext.grid.get(r, c);
        if (prev !== next) {
          changedCells.push({ r: r, c: c, prev: prev, next: next });
        }
      }
    }

    return new Witness({
      changedCells: changedCells,
      pieceType: statePrev.currentPiece ? statePrev.currentPiece.type : null,
      piecePosition: statePrev.piecePosition,
      scoreChange: stateNext.score - statePrev.score
    });
  };

  PoPEngine.prototype.verifyPoP = function(pop, statePrev, verifyFn) {
    // Verify prevCommit
    var computedPrevCommit = this.hashEngine.hashGrid(statePrev.grid);
    if (computedPrevCommit !== pop.prevCommit) {
      return { valid: false, error: 'prevCommit mismatch' };
    }

    // Replay action
    var stateNext = this.gameEngine.applyAction(statePrev, pop.action);
    if (!stateNext) {
      return { valid: false, error: 'Invalid action replay' };
    }

    // Verify nextCommit
    var computedNextCommit = this.hashEngine.hashGrid(stateNext.grid);
    if (computedNextCommit !== pop.nextCommit) {
      return { valid: false, error: 'nextCommit mismatch' };
    }

    // Verify signature if present
    if (pop.signature && verifyFn) {
      var message = pop.prevCommit + '||' + pop.action.type + '||' + pop.nextCommit;
      if (!verifyFn(message, pop.signature)) {
        return { valid: false, error: 'Signature verification failed' };
      }
    }

    return { valid: true, stateNext: stateNext };
  };

  // ========================================
  // PoPChain
  // ========================================

  function PoPChain(hashEngine) {
    this.hashEngine = hashEngine || new HashEngine();
    this.pops = [];
    this.initialCommit = null;
  }

  PoPChain.prototype.append = function(pop) {
    if (this.pops.length === 0) {
      this.initialCommit = pop.prevCommit;
    } else {
      var lastPop = this.pops[this.pops.length - 1];
      if (lastPop.nextCommit !== pop.prevCommit) {
        throw new Error('Chain linkage broken');
      }
    }
    this.pops.push(pop);
    return this;
  };

  PoPChain.prototype.verify = function(popEngine, initialState, verifyFn) {
    if (this.pops.length === 0) {
      return { valid: true };
    }

    var state = initialState;

    for (var i = 0; i < this.pops.length; i++) {
      var pop = this.pops[i];
      var result = popEngine.verifyPoP(pop, state, verifyFn);

      if (!result.valid) {
        return { valid: false, error: 'PoP ' + i + ': ' + result.error };
      }

      state = result.stateNext;

      // Check chain linkage
      if (i < this.pops.length - 1) {
        if (pop.nextCommit !== this.pops[i + 1].prevCommit) {
          return { valid: false, error: 'Chain linkage broken at index ' + i };
        }
      }
    }

    return { valid: true, finalState: state };
  };

  PoPChain.prototype.getFinalCommit = function() {
    if (this.pops.length === 0) return this.initialCommit;
    return this.pops[this.pops.length - 1].nextCommit;
  };

  PoPChain.prototype.length = function() {
    return this.pops.length;
  };

  PoPChain.prototype.toJSON = function() {
    return {
      pops: this.pops.map(function(p) { return p.toJSON(); }),
      initialCommit: this.initialCommit
    };
  };

  PoPChain.fromJSON = function(json, hashEngine) {
    if (typeof json === 'string') json = JSON.parse(json);
    var chain = new PoPChain(hashEngine);
    chain.initialCommit = json.initialCommit;
    chain.pops = json.pops.map(function(p) { return PoP.fromJSON(p); });
    return chain;
  };

  // ========================================
  // Challenge
  // ========================================

  function Challenge(options) {
    options = options || {};
    this.id = options.id || generateId('chal');
    this.seed = options.seed || Date.now();
    this.difficulty = options.difficulty || 1.0;
    this.initialState = options.initialState || null;
    this.maxMoves = options.maxMoves || 200;
    this.targetScore = options.targetScore || null;
    this.constraints = options.constraints || [];
    this.timestamp = options.timestamp || timestamp();
  }

  Challenge.prototype.toJSON = function() {
    return {
      id: this.id,
      seed: this.seed,
      difficulty: this.difficulty,
      initialState: this.initialState ? this.initialState.toJSON() : null,
      maxMoves: this.maxMoves,
      targetScore: this.targetScore,
      constraints: this.constraints,
      timestamp: this.timestamp
    };
  };

  Challenge.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new Challenge({
      id: json.id,
      seed: json.seed,
      difficulty: json.difficulty,
      initialState: json.initialState ? GameState.fromJSON(json.initialState) : null,
      maxMoves: json.maxMoves,
      targetScore: json.targetScore,
      constraints: json.constraints,
      timestamp: json.timestamp
    });
  };

  // ========================================
  // PoL (Proof-of-Learning)
  // ========================================

  function PoL(options) {
    options = options || {};
    this.id = options.id || generateId('pol');
    this.agentId = options.agentId || null;
    this.challenge = options.challenge || null;
    this.attempts = options.attempts || [];
    this.scores = options.scores || [];
    this.improvement = options.improvement || null;
    this.signature = options.signature || null;
    this.timestamp = options.timestamp || timestamp();
  }

  PoL.prototype.toJSON = function() {
    return {
      id: this.id,
      agentId: this.agentId,
      challenge: this.challenge ? this.challenge.toJSON() : null,
      attempts: this.attempts.map(function(chain) { return chain.toJSON(); }),
      scores: this.scores,
      improvement: this.improvement,
      signature: this.signature,
      timestamp: this.timestamp
    };
  };

  PoL.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new PoL({
      id: json.id,
      agentId: json.agentId,
      challenge: json.challenge ? Challenge.fromJSON(json.challenge) : null,
      attempts: json.attempts.map(function(c) { return PoPChain.fromJSON(c); }),
      scores: json.scores,
      improvement: json.improvement,
      signature: json.signature,
      timestamp: json.timestamp
    });
  };

  // ========================================
  // PoLEngine
  // ========================================

  function PoLEngine(popEngine, options) {
    EventEmitter.call(this);
    options = options || {};
    this.popEngine = popEngine;
    this.gameEngine = popEngine.gameEngine;
    this.hashEngine = popEngine.hashEngine;

    // Scoring weights
    this.scoreWeight = options.scoreWeight || 1.0;
    this.linesWeight = options.linesWeight || 10.0;
    this.efficiencyWeight = options.efficiencyWeight || 0.1;
  }

  PoLEngine.prototype = Object.create(EventEmitter.prototype);
  PoLEngine.prototype.constructor = PoLEngine;

  PoLEngine.prototype.generateChallenge = function(seed, difficulty) {
    difficulty = difficulty || 1.0;
    var rng = new SeededRNG(seed);

    // Initialize game
    this.gameEngine.seed = seed;
    var state = this.gameEngine.init();

    // Add initial obstacles based on difficulty
    var obstacleRows = Math.floor(difficulty * 5);
    for (var r = state.grid.rows - obstacleRows; r < state.grid.rows; r++) {
      var filledCols = Math.floor(rng.next() * (state.grid.cols - 2)) + 1;
      for (var c = 0; c < filledCols; c++) {
        var col = Math.floor(rng.next() * state.grid.cols);
        state.grid.set(r, col, CoreModule.PALETTE[Math.floor(rng.next() * (CoreModule.PALETTE.length - 1)) + 1]);
      }
    }

    return new Challenge({
      seed: seed,
      difficulty: difficulty,
      initialState: state,
      maxMoves: Math.floor(200 / difficulty),
      targetScore: Math.floor(1000 * difficulty)
    });
  };

  PoLEngine.prototype.scoreAttempt = function(trajectory, challenge) {
    if (trajectory.length === 0) return 0;

    var finalState = trajectory[trajectory.length - 1];
    var score = finalState.score * this.scoreWeight;
    score += finalState.linesCleared * this.linesWeight;
    score += (challenge.maxMoves - finalState.moveCount) * this.efficiencyWeight;

    // Bonus for reaching target
    if (challenge.targetScore && finalState.score >= challenge.targetScore) {
      score *= 1.5;
    }

    // Penalty for game over
    if (finalState.gameOver) {
      score *= 0.8;
    }

    return Math.max(0, score);
  };

  PoLEngine.prototype.computeImprovement = function(scores) {
    if (scores.length < 2) {
      return { slope: 0, improvement: 0, initial: scores[0] || 0, final: scores[0] || 0 };
    }

    var n = scores.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (var i = 0; i < n; i++) {
      sumX += i;
      sumY += scores[i];
      sumXY += i * scores[i];
      sumX2 += i * i;
    }

    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var initial = scores[0];
    var final = scores[n - 1];
    var best = Math.max.apply(null, scores);
    var mean = sumY / n;

    return {
      slope: slope,
      improvement: (final - initial) / Math.max(initial, 1),
      percentImprovement: ((final - initial) / Math.max(initial, 1)) * 100,
      initial: initial,
      final: final,
      best: best,
      mean: mean,
      attemptCount: n
    };
  };

  PoLEngine.prototype.generatePoL = function(agentPlayFn, challenge, numAttempts, signFn) {
    var attempts = [];
    var scores = [];

    for (var i = 0; i < numAttempts; i++) {
      // Reset to challenge initial state
      var state = challenge.initialState.copy();
      var popChain = new PoPChain(this.hashEngine);
      popChain.initialCommit = this.hashEngine.hashGrid(state.grid);

      var trajectory = [state.copy()];

      // Play until game over or max moves
      while (!state.gameOver && state.moveCount < challenge.maxMoves) {
        var action = agentPlayFn(state, challenge);
        if (!action) break;

        var result = this.popEngine.generatePoP(state, action, signFn);
        popChain.append(result.pop);
        state = result.stateNext;
        trajectory.push(state.copy());
      }

      attempts.push(popChain);
      scores.push(this.scoreAttempt(trajectory, challenge));

      this.emit('attemptComplete', { attempt: i, score: scores[i] });
    }

    var improvement = this.computeImprovement(scores);

    var pol = new PoL({
      agentId: agentPlayFn.agentId || 'unknown',
      challenge: challenge,
      attempts: attempts,
      scores: scores,
      improvement: improvement
    });

    this.emit('polGenerated', { pol: pol });
    return pol;
  };

  PoLEngine.prototype.verifyPoL = function(pol, verifyFn) {
    var results = {
      valid: true,
      errors: [],
      verifiedAttempts: 0
    };

    for (var i = 0; i < pol.attempts.length; i++) {
      var chain = pol.attempts[i];
      var verification = chain.verify(
        this.popEngine,
        pol.challenge.initialState,
        verifyFn
      );

      if (!verification.valid) {
        results.valid = false;
        results.errors.push('Attempt ' + i + ': ' + verification.error);
      } else {
        results.verifiedAttempts++;
      }
    }

    // Verify improvement calculation
    var computedImprovement = this.computeImprovement(pol.scores);
    if (Math.abs(computedImprovement.slope - pol.improvement.slope) > 0.001) {
      results.errors.push('Improvement calculation mismatch');
    }

    return results;
  };

  // ========================================
  // Module Export
  // ========================================

  var ProofModule = {
    Witness: Witness,
    PoP: PoP,
    PoPEngine: PoPEngine,
    PoPChain: PoPChain,
    Challenge: Challenge,
    PoL: PoL,
    PoLEngine: PoLEngine
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProofModule;
  } else {
    global.DetrisProof = ProofModule;
  }

})(typeof window !== 'undefined' ? window : this);
