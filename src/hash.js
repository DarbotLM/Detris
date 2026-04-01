/**
 * Detris - Hash Engine
 *
 * Cryptographic hashing, Merkle trees, and commitment schemes.
 *
 * @module detris/hash
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

  var Codec = CoreModule.Codec;

  // ========================================
  // SHA-256 Implementation
  // ========================================

  // SHA-256 constants
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  var H0 = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  function ch(x, y, z) {
    return ((x & y) ^ (~x & z)) >>> 0;
  }

  function maj(x, y, z) {
    return ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
  }

  function sigma0(x) {
    return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
  }

  function sigma1(x) {
    return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
  }

  function gamma0(x) {
    return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
  }

  function gamma1(x) {
    return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;
  }

  function sha256(message) {
    // Convert string to bytes
    var bytes;
    if (typeof message === 'string') {
      bytes = [];
      for (var i = 0; i < message.length; i++) {
        var charCode = message.charCodeAt(i);
        if (charCode < 128) {
          bytes.push(charCode);
        } else if (charCode < 2048) {
          bytes.push(0xc0 | (charCode >> 6));
          bytes.push(0x80 | (charCode & 0x3f));
        } else if (charCode < 65536) {
          bytes.push(0xe0 | (charCode >> 12));
          bytes.push(0x80 | ((charCode >> 6) & 0x3f));
          bytes.push(0x80 | (charCode & 0x3f));
        } else {
          bytes.push(0xf0 | (charCode >> 18));
          bytes.push(0x80 | ((charCode >> 12) & 0x3f));
          bytes.push(0x80 | ((charCode >> 6) & 0x3f));
          bytes.push(0x80 | (charCode & 0x3f));
        }
      }
    } else if (Array.isArray(message)) {
      bytes = message;
    } else {
      bytes = Array.from(message);
    }

    // Pre-processing: padding
    var msgLen = bytes.length;
    var bitLen = msgLen * 8;
    bytes.push(0x80);
    while ((bytes.length + 8) % 64 !== 0) {
      bytes.push(0x00);
    }

    // Append length as 64-bit big-endian
    for (var j = 7; j >= 0; j--) {
      bytes.push((bitLen >>> (j * 8)) & 0xff);
    }

    // Initialize hash values
    var h = H0.slice();

    // Process each 512-bit chunk
    for (var chunk = 0; chunk < bytes.length; chunk += 64) {
      var W = new Array(64);

      // Copy chunk into first 16 words
      for (var t = 0; t < 16; t++) {
        W[t] = (bytes[chunk + t * 4] << 24) |
               (bytes[chunk + t * 4 + 1] << 16) |
               (bytes[chunk + t * 4 + 2] << 8) |
               bytes[chunk + t * 4 + 3];
        W[t] = W[t] >>> 0;
      }

      // Extend words
      for (var t2 = 16; t2 < 64; t2++) {
        W[t2] = (gamma1(W[t2 - 2]) + W[t2 - 7] + gamma0(W[t2 - 15]) + W[t2 - 16]) >>> 0;
      }

      // Initialize working variables
      var a = h[0], b = h[1], c = h[2], d = h[3];
      var e = h[4], f = h[5], g = h[6], hh = h[7];

      // Main loop
      for (var t3 = 0; t3 < 64; t3++) {
        var T1 = (hh + sigma1(e) + ch(e, f, g) + K[t3] + W[t3]) >>> 0;
        var T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
        hh = g;
        g = f;
        f = e;
        e = (d + T1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (T1 + T2) >>> 0;
      }

      // Add compressed chunk to hash
      h[0] = (h[0] + a) >>> 0;
      h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0;
      h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0;
      h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0;
      h[7] = (h[7] + hh) >>> 0;
    }

    // Convert to hex string
    var hex = '';
    for (var k = 0; k < 8; k++) {
      hex += ('00000000' + h[k].toString(16)).slice(-8);
    }
    return hex;
  }

  // ========================================
  // HashEngine
  // ========================================

  function HashEngine() {
    this.codec = Codec.instance;
  }

  HashEngine.prototype.hash = function(data) {
    if (typeof data === 'string') {
      return sha256(data);
    }
    if (Array.isArray(data)) {
      return sha256(data);
    }
    return sha256(JSON.stringify(data));
  };

  HashEngine.prototype.hashGrid = function(grid) {
    var serialized = this.codec.gridToUtf8(grid);
    return sha256(serialized);
  };

  HashEngine.prototype.hashRow = function(row) {
    var serialized = row.join('');
    return sha256(serialized);
  };

  HashEngine.prototype.hashBytes = function(bytes) {
    return sha256(bytes);
  };

  HashEngine.prototype.hashHex = function(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return sha256(bytes);
  };

  // Combine two hashes
  HashEngine.prototype.combineHashes = function(hash1, hash2) {
    return sha256(hash1 + hash2);
  };

  // ========================================
  // MerkleTree
  // ========================================

  function MerkleTree(leaves, hashEngine) {
    this.hashEngine = hashEngine || new HashEngine();
    this.leaves = leaves || [];
    this.layers = [];
    this.root = null;

    if (this.leaves.length > 0) {
      this._build();
    }
  }

  MerkleTree.prototype._build = function() {
    // Hash leaves
    var self = this;
    var currentLayer = this.leaves.map(function(leaf) {
      return typeof leaf === 'string' && leaf.length === 64 ? leaf : self.hashEngine.hash(leaf);
    });

    this.layers = [currentLayer.slice()];

    // Build tree
    while (currentLayer.length > 1) {
      var nextLayer = [];

      // Pad to even length
      if (currentLayer.length % 2 === 1) {
        currentLayer.push(currentLayer[currentLayer.length - 1]);
      }

      for (var i = 0; i < currentLayer.length; i += 2) {
        var combined = this.hashEngine.combineHashes(currentLayer[i], currentLayer[i + 1]);
        nextLayer.push(combined);
      }

      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    this.root = currentLayer[0] || null;
  };

  MerkleTree.prototype.getRoot = function() {
    return this.root;
  };

  MerkleTree.prototype.getProof = function(index) {
    if (index < 0 || index >= this.leaves.length) {
      return null;
    }

    var proof = [];
    var idx = index;

    for (var i = 0; i < this.layers.length - 1; i++) {
      var layer = this.layers[i];
      var isRight = idx % 2 === 1;
      var siblingIdx = isRight ? idx - 1 : idx + 1;

      if (siblingIdx < layer.length) {
        proof.push({
          hash: layer[siblingIdx],
          position: isRight ? 'left' : 'right'
        });
      }

      idx = Math.floor(idx / 2);
    }

    return proof;
  };

  MerkleTree.prototype.verify = function(leaf, proof, root) {
    var hash = typeof leaf === 'string' && leaf.length === 64 ? leaf : this.hashEngine.hash(leaf);

    for (var i = 0; i < proof.length; i++) {
      var sibling = proof[i];
      if (sibling.position === 'left') {
        hash = this.hashEngine.combineHashes(sibling.hash, hash);
      } else {
        hash = this.hashEngine.combineHashes(hash, sibling.hash);
      }
    }

    return hash === root;
  };

  MerkleTree.prototype.addLeaf = function(leaf) {
    this.leaves.push(leaf);
    this._build();
    return this;
  };

  // ========================================
  // GridMerkleTree
  // ========================================

  function GridMerkleTree(grid, hashEngine) {
    this.hashEngine = hashEngine || new HashEngine();
    this.grid = grid;
    this.rowHashes = [];
    this.merkleTree = null;

    this._build();
  }

  GridMerkleTree.prototype._build = function() {
    var self = this;
    this.rowHashes = [];

    for (var r = 0; r < this.grid.rows; r++) {
      var row = this.grid.getRow(r);
      this.rowHashes.push(this.hashEngine.hashRow(row));
    }

    this.merkleTree = new MerkleTree(this.rowHashes, this.hashEngine);
  };

  GridMerkleTree.prototype.getRoot = function() {
    return this.merkleTree.getRoot();
  };

  GridMerkleTree.prototype.getRowProof = function(rowIndex) {
    return this.merkleTree.getProof(rowIndex);
  };

  GridMerkleTree.prototype.verifyRow = function(row, rowIndex, proof) {
    var rowHash = this.hashEngine.hashRow(row);
    return this.merkleTree.verify(rowHash, proof, this.getRoot());
  };

  // ========================================
  // Commitment Scheme
  // ========================================

  function Commitment(hashEngine) {
    this.hashEngine = hashEngine || new HashEngine();
  }

  Commitment.prototype.commit = function(value, nonce) {
    nonce = nonce || this._generateNonce();
    var commitment = this.hashEngine.hash(value + '||' + nonce);
    return {
      commitment: commitment,
      nonce: nonce
    };
  };

  Commitment.prototype.reveal = function(value, nonce, commitment) {
    var computed = this.hashEngine.hash(value + '||' + nonce);
    return computed === commitment;
  };

  Commitment.prototype._generateNonce = function() {
    var chars = 'abcdef0123456789';
    var nonce = '';
    for (var i = 0; i < 32; i++) {
      nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
  };

  // ========================================
  // HashChain
  // ========================================

  function HashChain(hashEngine) {
    this.hashEngine = hashEngine || new HashEngine();
    this.chain = [];
    this.head = null;
  }

  HashChain.prototype.append = function(data) {
    var prevHash = this.head || '0'.repeat(64);
    var hash = this.hashEngine.hash(prevHash + '||' + JSON.stringify(data));

    var block = {
      index: this.chain.length,
      prevHash: prevHash,
      data: data,
      hash: hash,
      timestamp: CoreModule.timestamp()
    };

    this.chain.push(block);
    this.head = hash;

    return block;
  };

  HashChain.prototype.verify = function() {
    for (var i = 0; i < this.chain.length; i++) {
      var block = this.chain[i];

      // Verify hash
      var expectedPrev = i === 0 ? '0'.repeat(64) : this.chain[i - 1].hash;
      if (block.prevHash !== expectedPrev) {
        return { valid: false, error: 'Invalid prevHash at index ' + i };
      }

      var computedHash = this.hashEngine.hash(block.prevHash + '||' + JSON.stringify(block.data));
      if (computedHash !== block.hash) {
        return { valid: false, error: 'Invalid hash at index ' + i };
      }
    }

    return { valid: true };
  };

  HashChain.prototype.getBlock = function(index) {
    return this.chain[index] || null;
  };

  HashChain.prototype.length = function() {
    return this.chain.length;
  };

  HashChain.prototype.toJSON = function() {
    return {
      chain: this.chain,
      head: this.head
    };
  };

  HashChain.fromJSON = function(json, hashEngine) {
    if (typeof json === 'string') json = JSON.parse(json);
    var chain = new HashChain(hashEngine);
    chain.chain = json.chain;
    chain.head = json.head;
    return chain;
  };

  // ========================================
  // Module Export
  // ========================================

  var HashModule = {
    sha256: sha256,
    HashEngine: HashEngine,
    MerkleTree: MerkleTree,
    GridMerkleTree: GridMerkleTree,
    Commitment: Commitment,
    HashChain: HashChain
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HashModule;
  } else {
    global.DetrisHash = HashModule;
  }

})(typeof window !== 'undefined' ? window : this);
