/** Normal meteors use these tiers; each one holds words of a single length. */
export type NormalTier =
  'easy' | 'medium' | 'hard' | 'expert' | 'master' | 'legend';

/** `golden` holds every word longer than 8 letters, for golden meteors only. */
export type WordTier = NormalTier | 'golden';

/** Letters per word in each normal tier, easiest first. */
export const TIER_LENGTHS: Record<NormalTier, number> = {
  easy: 3,
  medium: 4,
  hard: 5,
  expert: 6,
  master: 7,
  legend: 8,
};

export const NORMAL_TIERS: readonly NormalTier[] = [
  'easy',
  'medium',
  'hard',
  'expert',
  'master',
  'legend',
];

/**
 * Curated, lowercase, alphabetic-only word bank grouped by word length:
 * easy 3 letters, medium 4, hard 5, expert 6, master 7, legend 8, and
 * golden for anything longer.
 */
// prettier-ignore
export const WORDS: Record<WordTier, readonly string[]> = {
  easy: [
    'cat', 'dog', 'sun', 'sky', 'orb', 'ion', 'ray', 'arc', 'gas', 'ice', 'zap',
    'jet', 'bug', 'bit', 'key', 'run', 'map', 'set', 'log', 'git', 'web', 'app',
    'api', 'css', 'tab', 'zip', 'fox', 'owl', 'bee', 'ant', 'yak', 'elk', 'gem',
    'ore', 'aim', 'hit', 'win', 'top', 'joy', 'vex', 'hex', 'pod', 'ace', 'axe',
    'fly', 'pad', 'rig', 'hub', 'bot', 'ram', 'cpu', 'net', 'box', 'dot', 'pin',
    'rod', 'fin', 'cap', 'fog', 'lab', 'zen', 'ark', 'bay', 'cog', 'dim', 'fan',
    'gap', 'hop', 'ink', 'kit', 'lux', 'nut', 'oak', 'pop', 'rim', 'tug', 'vat',
    'wit',
  ],
  medium: [
    'moon', 'star', 'fire', 'ship', 'rock', 'dust', 'void', 'beam', 'core',
    'nova', 'fuel', 'warp', 'mars', 'dark', 'glow', 'bolt', 'hull', 'wing',
    'code', 'byte', 'loop', 'node', 'data', 'type', 'fast', 'hero', 'boom',
    'spin', 'dash', 'jump', 'kick', 'race', 'wave', 'zone', 'path', 'gate',
    'base', 'dock', 'crew', 'mode', 'iron', 'gold', 'neon', 'lime', 'ruby',
    'jade', 'mint', 'echo', 'halo', 'veil', 'mist', 'haze', 'scan', 'ping',
    'lock', 'shot', 'cube', 'disk', 'ring', 'mesh', 'grid',
  ],
  hard: [
    'alien', 'laser', 'blast', 'pulse', 'orbit', 'comet', 'storm', 'flare',
    'light', 'speed', 'quick', 'pilot', 'frost', 'ember', 'spark', 'drift',
    'shell', 'probe', 'radar', 'sonar', 'pixel', 'quest', 'venus', 'rover',
    'merge', 'class', 'karma', 'combo', 'rapid', 'turbo', 'armor', 'cadet',
    'amber', 'robot', 'space', 'earth', 'lunar', 'solar', 'titan', 'pluto',
    'atlas', 'delta', 'gamma', 'sigma', 'omega', 'alpha', 'focus', 'flash',
    'glide', 'hover', 'crash', 'shock', 'sword', 'tower', 'brave', 'swift',
    'sharp', 'blaze', 'flame', 'steel', 'metal', 'stone', 'cloud', 'night',
    'dream', 'ghost', 'magic', 'power', 'query', 'array', 'stack', 'queue',
    'cache', 'token', 'debug', 'fetch', 'parse', 'build', 'patch', 'clone',
    'shift', 'input', 'mouse', 'click', 'score', 'level', 'bonus', 'enemy',
    'guard', 'squad', 'fleet', 'scout', 'medal', 'crown', 'sonic', 'ultra',
    'hyper', 'vivid',
  ],
  expert: [
    'rocket', 'planet', 'meteor', 'galaxy', 'coding', 'typing', 'nebula',
    'cosmos', 'quasar', 'pulsar', 'saturn', 'uranus', 'module', 'lander',
    'crater', 'photon', 'proton', 'plasma', 'fusion', 'vector', 'radius',
    'vortex', 'zenith', 'apollo', 'gemini', 'launch', 'signal', 'beacon',
    'server', 'client', 'router', 'socket', 'binary', 'syntax', 'deploy',
    'commit', 'branch', 'rebase', 'script', 'object', 'string', 'number',
    'method', 'import', 'export', 'lambda', 'reddit', 'upvote', 'arcade',
    'streak', 'player', 'reflex', 'sprint', 'charge', 'impact', 'debris',
    'cannon', 'hangar', 'silent', 'frozen', 'molten', 'silver', 'cobalt',
    'violet', 'shadow', 'mirror', 'puzzle', 'riddle', 'wizard',
  ],
  master: [
    'browser', 'jupiter', 'neptune', 'mercury', 'eclipse', 'gravity', 'orbital',
    'booster', 'shields', 'cockpit', 'capsule', 'payload', 'station', 'voyager',
    'shuttle', 'stellar', 'neutron', 'quantum', 'reactor', 'impulse', 'horizon',
    'cluster', 'mission', 'antenna', 'compile', 'boolean', 'promise', 'comment',
    'shooter', 'trigger', 'blaster', 'missile', 'torpedo', 'captain', 'admiral',
    'pioneer', 'explore', 'distant', 'crystal', 'scarlet', 'emerald', 'backend',
    'kinetic', 'phantom', 'thunder', 'cyclone', 'tornado', 'volcano', 'diamond',
    'phoenix', 'machine', 'network', 'program', 'console', 'display', 'monitor',
    'gateway', 'runtime', 'package', 'library', 'session', 'pointer', 'integer',
    'defense', 'warrior', 'fighter', 'victory', 'mastery', 'journey', 'mystery',
    'fantasy', 'digital', 'circuit', 'battery', 'charger',
  ],
  legend: [
    'keyboard', 'thruster', 'callback', 'joystick', 'fragment', 'asteroid',
    'database', 'frontend', 'wormhole', 'nebulous', 'variable', 'function',
    'compiler', 'terminal', 'endpoint', 'resolver', 'firewall', 'protocol',
    'iterator', 'shortcut', 'velocity', 'momentum', 'spectrum', 'particle',
    'molecule', 'electron', 'magnetic', 'electric', 'universe', 'parallel',
    'infinite', 'eternity', 'starship', 'computer', 'software', 'hardware',
    'password', 'operator', 'guardian', 'champion', 'conquest', 'hologram',
    'marathon', 'platform', 'pipeline', 'register', 'security', 'sequence',
    'strategy', 'template', 'ultimate', 'aircraft', 'backpack', 'daylight',
    'midnight', 'moonbeam', 'sunshine', 'infinity', 'graphics', 'download',
    'checksum', 'language', 'overflow', 'argument', 'abstract',
  ],
  golden: [
    'spaceship', 'astronaut', 'satellite', 'telescope', 'starlight', 'supernova',
    'blackhole', 'spacewalk', 'moonlight', 'stargazer', 'astronomy', 'continuum',
    'commander', 'destroyer', 'algorithm', 'framework', 'component', 'interface',
    'parameter', 'recursion', 'iteration', 'debugging', 'container', 'scheduler',
    'processor', 'bandwidth', 'websocket', 'singleton', 'generator', 'prototype',
    'reference', 'semicolon', 'keystroke', 'highscore', 'challenge', 'countdown',
    'explosion', 'detonator', 'shockwave', 'barricade', 'defensive', 'offensive',
    'precision', 'magnitude', 'frequency', 'amplitude', 'radiation', 'dimension',
    'labyrinth', 'javascript', 'typescript', 'trajectory', 'propulsion',
    'atmosphere', 'hyperdrive', 'navigation', 'lieutenant', 'battleship',
    'mothership', 'repository', 'kubernetes', 'serverless', 'middleware',
    'encryption', 'whitespace', 'starfighter', 'gravitation', 'inheritance',
    'leaderboard', 'abstraction', 'concurrency', 'scalability', 'refactoring',
    'observatory', 'planetarium', 'unstoppable', 'interstellar', 'sharpshooter',
    'asynchronous', 'architecture', 'optimization', 'polymorphism',
    'availability', 'dependencies', 'minification', 'tokenization',
    'astrophysics', 'acceleration', 'deceleration', 'stratosphere',
    'spectroscopy', 'cosmological', 'unbelievable', 'productivity',
    'configuration', 'encapsulation', 'serialization', 'authorization',
    'documentation', 'compatibility', 'accessibility', 'microservices',
    'orchestration', 'observability', 'transpilation', 'interpolation',
    'constellation', 'circumference', 'gravitational', 'thermonuclear',
    'intergalactic', 'decompression', 'magnetosphere', 'extraordinary',
    'unpredictable', 'counterattack', 'determination', 'concentration',
    'collaboration', 'communication', 'implementation', 'virtualization',
    'authentication', 'initialization', 'responsiveness', 'infrastructure',
    'interplanetary', 'reconnaissance', 'indestructible', 'deserialization',
    'parallelization', 'synchronization', 'electromagnetic', 'experimentation',
    'containerization', 'extraterrestrial', 'incomprehensible',
    'internationalization',
  ],
};
