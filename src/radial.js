/**
 * Detris - Radial Data Zones
 *
 * Structured communication channels embedded within game grids.
 *
 * @module detris/radial
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // Import modules
  var CoreModule, HashModule;
  if (typeof require !== 'undefined') {
    CoreModule = require('./core');
    HashModule = require('./hash');
  } else {
    CoreModule = global.DetrisCore;
    HashModule = global.DetrisHash;
  }

  var Grid = CoreModule.Grid;
  var Codec = CoreModule.Codec;
  var EventEmitter = CoreModule.EventEmitter;
  var generateId = CoreModule.generateId;
  var timestamp = CoreModule.timestamp;
  var PALETTE = CoreModule.PALETTE;

  var HashEngine = HashModule.HashEngine;

  // ========================================
  // Zone Types
  // ========================================

  var ZONE_TYPES = {
    IDENTITY: 'IDENTITY',       // Agent identification
    MESSAGE: 'MESSAGE',         // Communication payload
    SIGNATURE: 'SIGNATURE',     // Cryptographic signature
    TIMESTAMP: 'TIMESTAMP',     // Time encoding
    METADATA: 'METADATA',       // Additional data
    CHECKSUM: 'CHECKSUM'        // Error detection
  };

  var ZONE_LAYOUTS = {
    STANDARD: 'STANDARD',       // Default layout
    COMPACT: 'COMPACT',         // Minimal space
    REDUNDANT: 'REDUNDANT'      // Error-correcting
  };

  // ========================================
  // RadialZone
  // ========================================

  function RadialZone(options) {
    options = options || {};
    this.id = options.id || generateId('zone');
    this.type = options.type || ZONE_TYPES.MESSAGE;
    this.centerRow = options.centerRow || 5;
    this.centerCol = options.centerCol || 5;
    this.radius = options.radius || 2;
    this.cells = options.cells || [];
  }

  RadialZone.prototype.getCells = function(grid) {
    var cells = [];
    var centerR = this.centerRow;
    var centerC = this.centerCol;
    var radius = this.radius;

    // Collect cells in radial order (clockwise spiral from center)
    for (var ring = 0; ring <= radius; ring++) {
      if (ring === 0) {
        // Center cell
        if (grid.inBounds(centerR, centerC)) {
          cells.push({ r: centerR, c: centerC, ring: 0, angle: 0 });
        }
      } else {
        // Ring cells - clockwise from top
        var directions = [
          [0, 1],   // right
          [1, 0],   // down
          [0, -1],  // left
          [-1, 0]   // up
        ];

        var r = centerR - ring;
        var c = centerC;

        for (var d = 0; d < 4; d++) {
          for (var step = 0; step < ring * 2; step++) {
            if (grid.inBounds(r, c)) {
              var angle = Math.atan2(r - centerR, c - centerC);
              cells.push({ r: r, c: c, ring: ring, angle: angle });
            }
            r += directions[d][0];
            c += directions[d][1];
          }
        }
      }
    }

    return cells;
  };

  RadialZone.prototype.encode = function(grid, data) {
    var cells = this.getCells(grid);
    var bytes = this._dataToBytes(data);

    for (var i = 0; i < cells.length && i < bytes.length; i++) {
      var cell = cells[i];
      var glyph = Codec.instance.encodeByte(bytes[i]);
      grid.set(cell.r, cell.c, glyph);
    }

    return grid;
  };

  RadialZone.prototype.decode = function(grid) {
    var cells = this.getCells(grid);
    var bytes = [];

    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var glyph = grid.get(cell.r, cell.c);
      bytes.push(Codec.instance.decodeByte(glyph));
    }

    return this._bytesToData(bytes);
  };

  RadialZone.prototype._dataToBytes = function(data) {
    if (typeof data === 'string') {
      var bytes = [];
      for (var i = 0; i < data.length; i++) {
        bytes.push(data.charCodeAt(i) & 0xFF);
      }
      return bytes;
    }
    if (Array.isArray(data)) {
      return data.map(function(b) { return b & 0xFF; });
    }
    if (typeof data === 'number') {
      var numBytes = [];
      while (data > 0) {
        numBytes.unshift(data & 0xFF);
        data = Math.floor(data / 256);
      }
      return numBytes.length > 0 ? numBytes : [0];
    }
    return [];
  };

  RadialZone.prototype._bytesToData = function(bytes) {
    return bytes;
  };

  RadialZone.prototype.capacity = function(grid) {
    return this.getCells(grid).length;
  };

  RadialZone.prototype.toJSON = function() {
    return {
      id: this.id,
      type: this.type,
      centerRow: this.centerRow,
      centerCol: this.centerCol,
      radius: this.radius
    };
  };

  RadialZone.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    return new RadialZone(json);
  };

  // ========================================
  // ZoneLayout
  // ========================================

  function ZoneLayout(options) {
    options = options || {};
    this.id = options.id || generateId('layout');
    this.type = options.type || ZONE_LAYOUTS.STANDARD;
    this.zones = {};
    this.gridRows = options.gridRows || 10;
    this.gridCols = options.gridCols || 10;
  }

  ZoneLayout.prototype.addZone = function(name, zone) {
    this.zones[name] = zone;
    return this;
  };

  ZoneLayout.prototype.getZone = function(name) {
    return this.zones[name] || null;
  };

  ZoneLayout.prototype.removeZone = function(name) {
    delete this.zones[name];
    return this;
  };

  ZoneLayout.prototype.encodeAll = function(grid, dataMap) {
    var self = this;
    Object.keys(dataMap).forEach(function(name) {
      var zone = self.zones[name];
      if (zone) {
        zone.encode(grid, dataMap[name]);
      }
    });
    return grid;
  };

  ZoneLayout.prototype.decodeAll = function(grid) {
    var result = {};
    var self = this;
    Object.keys(this.zones).forEach(function(name) {
      result[name] = self.zones[name].decode(grid);
    });
    return result;
  };

  ZoneLayout.prototype.toJSON = function() {
    var zonesJson = {};
    var self = this;
    Object.keys(this.zones).forEach(function(name) {
      zonesJson[name] = self.zones[name].toJSON();
    });
    return {
      id: this.id,
      type: this.type,
      zones: zonesJson,
      gridRows: this.gridRows,
      gridCols: this.gridCols
    };
  };

  ZoneLayout.fromJSON = function(json) {
    if (typeof json === 'string') json = JSON.parse(json);
    var layout = new ZoneLayout({
      id: json.id,
      type: json.type,
      gridRows: json.gridRows,
      gridCols: json.gridCols
    });
    Object.keys(json.zones).forEach(function(name) {
      layout.addZone(name, RadialZone.fromJSON(json.zones[name]));
    });
    return layout;
  };

  // Standard layouts
  ZoneLayout.STANDARD = function() {
    var layout = new ZoneLayout({ type: ZONE_LAYOUTS.STANDARD });
    layout.addZone('identity', new RadialZone({
      type: ZONE_TYPES.IDENTITY,
      centerRow: 1,
      centerCol: 1,
      radius: 1
    }));
    layout.addZone('message', new RadialZone({
      type: ZONE_TYPES.MESSAGE,
      centerRow: 5,
      centerCol: 5,
      radius: 3
    }));
    layout.addZone('checksum', new RadialZone({
      type: ZONE_TYPES.CHECKSUM,
      centerRow: 8,
      centerCol: 8,
      radius: 1
    }));
    return layout;
  };

  // ========================================
  // AgentChannel
  // ========================================

  function AgentChannel(options) {
    EventEmitter.call(this);
    options = options || {};
    this.id = options.id || generateId('channel');
    this.agentId = options.agentId || null;
    this.layout = options.layout || ZoneLayout.STANDARD();
    this.hashEngine = options.hashEngine || new HashEngine();
    this.messages = [];
  }

  AgentChannel.prototype = Object.create(EventEmitter.prototype);
  AgentChannel.prototype.constructor = AgentChannel;

  AgentChannel.prototype.encodeMessage = function(message, grid) {
    grid = grid || new Grid(this.layout.gridRows, this.layout.gridCols);

    var payload = {
      identity: this._encodeAgentId(this.agentId),
      message: this._encodeString(message.content || ''),
      checksum: []
    };

    // Compute checksum
    var dataForChecksum = payload.identity.concat(payload.message);
    var checksum = this._computeChecksum(dataForChecksum);
    payload.checksum = [checksum & 0xFF, (checksum >> 8) & 0xFF];

    this.layout.encodeAll(grid, payload);

    var encodedMsg = {
      id: generateId('msg'),
      agentId: this.agentId,
      content: message.content,
      grid: grid,
      gridHash: this.hashEngine.hashGrid(grid),
      timestamp: timestamp()
    };

    this.messages.push(encodedMsg);
    this.emit('messageEncoded', encodedMsg);

    return encodedMsg;
  };

  AgentChannel.prototype.decodeMessage = function(grid) {
    var decoded = this.layout.decodeAll(grid);

    var identity = this._decodeAgentId(decoded.identity || []);
    var content = this._decodeString(decoded.message || []);
    var receivedChecksum = decoded.checksum || [];

    // Verify checksum
    var dataForChecksum = (decoded.identity || []).concat(decoded.message || []);
    var computedChecksum = this._computeChecksum(dataForChecksum);
    var valid = receivedChecksum.length >= 2 &&
      (receivedChecksum[0] | (receivedChecksum[1] << 8)) === computedChecksum;

    var message = {
      agentId: identity,
      content: content,
      checksumValid: valid,
      timestamp: timestamp()
    };

    this.emit('messageDecoded', message);
    return message;
  };

  AgentChannel.prototype._encodeAgentId = function(agentId) {
    if (!agentId) return [0, 0, 0, 0];
    var hash = this.hashEngine.hash(agentId);
    return [
      parseInt(hash.substr(0, 2), 16),
      parseInt(hash.substr(2, 2), 16),
      parseInt(hash.substr(4, 2), 16),
      parseInt(hash.substr(6, 2), 16)
    ];
  };

  AgentChannel.prototype._decodeAgentId = function(bytes) {
    if (bytes.length < 4) return null;
    return bytes.slice(0, 4).map(function(b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  };

  AgentChannel.prototype._encodeString = function(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) & 0xFF);
    }
    return bytes;
  };

  AgentChannel.prototype._decodeString = function(bytes) {
    return bytes.filter(function(b) { return b > 0 && b < 128; })
      .map(function(b) { return String.fromCharCode(b); })
      .join('');
  };

  AgentChannel.prototype._computeChecksum = function(bytes) {
    var sum = 0;
    for (var i = 0; i < bytes.length; i++) {
      sum = (sum + bytes[i]) & 0xFFFF;
    }
    return sum;
  };

  // ========================================
  // ChannelRegistry
  // ========================================

  function ChannelRegistry() {
    this.channels = {};
    this.hashEngine = new HashEngine();
  }

  ChannelRegistry.prototype.register = function(agentId, options) {
    options = options || {};
    options.agentId = agentId;
    options.hashEngine = this.hashEngine;

    var channel = new AgentChannel(options);
    this.channels[agentId] = channel;
    return channel;
  };

  ChannelRegistry.prototype.get = function(agentId) {
    return this.channels[agentId] || null;
  };

  ChannelRegistry.prototype.unregister = function(agentId) {
    delete this.channels[agentId];
  };

  ChannelRegistry.prototype.broadcast = function(message, excludeAgents) {
    excludeAgents = excludeAgents || [];
    var results = [];
    var self = this;

    Object.keys(this.channels).forEach(function(agentId) {
      if (excludeAgents.indexOf(agentId) === -1) {
        var encoded = self.channels[agentId].encodeMessage(message);
        results.push({ agentId: agentId, encoded: encoded });
      }
    });

    return results;
  };

  ChannelRegistry.prototype.listAgents = function() {
    return Object.keys(this.channels);
  };

  // ========================================
  // GridPayload
  // ========================================

  function GridPayload(options) {
    options = options || {};
    this.id = options.id || generateId('payload');
    this.type = options.type || 'generic';
    this.data = options.data || {};
    this.encoding = options.encoding || 'json';
    this.compressed = options.compressed || false;
  }

  GridPayload.prototype.toBytes = function() {
    var json = JSON.stringify(this.data);
    var bytes = [];
    for (var i = 0; i < json.length; i++) {
      bytes.push(json.charCodeAt(i) & 0xFF);
    }
    return bytes;
  };

  GridPayload.fromBytes = function(bytes) {
    var json = bytes.map(function(b) {
      return String.fromCharCode(b);
    }).join('');
    try {
      var data = JSON.parse(json);
      return new GridPayload({ data: data });
    } catch (e) {
      return new GridPayload({ data: { raw: bytes } });
    }
  };

  GridPayload.prototype.embedInGrid = function(grid, zone) {
    var bytes = this.toBytes();
    zone.encode(grid, bytes);
    return grid;
  };

  GridPayload.extractFromGrid = function(grid, zone) {
    var bytes = zone.decode(grid);
    return GridPayload.fromBytes(bytes);
  };

  // ========================================
  // Module Export
  // ========================================

  var RadialModule = {
    ZONE_TYPES: ZONE_TYPES,
    ZONE_LAYOUTS: ZONE_LAYOUTS,
    RadialZone: RadialZone,
    ZoneLayout: ZoneLayout,
    AgentChannel: AgentChannel,
    ChannelRegistry: ChannelRegistry,
    GridPayload: GridPayload
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RadialModule;
  } else {
    global.DetrisRadial = RadialModule;
  }

})(typeof window !== 'undefined' ? window : this);
