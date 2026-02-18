const USERNAME_MAX_LENGTH = 20;

const CONFIG = {
  port: 8080,
  hostname: '127.0.0.1',
} as const;

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',

  // System colors - distinct from user palette
  success: '\x1b[38;5;42m', // Emerald green (joins)
  error: '\x1b[38;5;203m', // Coral red (errors)
  warning: '\x1b[38;5;214m', // Amber (warnings)
  info: '\x1b[38;5;117m', // Sky blue (info)
  muted: '\x1b[38;5;240m', // Dark gray (system text)
  subtle: '\x1b[38;5;245m', // Medium gray (metadata)

  // Expanded user palette - 16 vibrant, distinct colors
  users: [
    '\x1b[38;5;130m', // muted warm brown / cinnamon
    '\x1b[38;5;166m', // solid orange (medium)
    '\x1b[38;5;208m', // bright-but-not-neon orange
    '\x1b[38;5;178m', // golden / mustard
    '\x1b[38;5;100m', // olive / subdued yellow-green
    '\x1b[38;5;64m', // forest / darkish green
    '\x1b[38;5;71m', // medium muted green
    '\x1b[38;5;77m', // fresh lime-ish green
    '\x1b[38;5;36m', // deep teal
    '\x1b[38;5;37m', // turquoise / cyan-green
    '\x1b[38;5;31m', // medium-strong blue
    '\x1b[38;5;68m', // softer steel blue
    '\x1b[38;5;104m', // muted lavender blue
    '\x1b[38;5;98m', // medium purple
    '\x1b[38;5;135m', // plum / violet
    '\x1b[38;5;169m', // medium magenta / rose
    '\x1b[38;5;204m', // soft coral red-pink
    '\x1b[38;5;167m', // muted brick red
  ],
} as const;

const USER_EMOJIS = [
  '🦆',
  '🦀',
  '🦎',
  '🦄',
  '🦦',
  '🐸',
  '🐙',
  '🦩',
  '🐢',
  '🦞',
  '🦕',
  '🦫',
  '🦒',
  '🦚',
  '🦜',
  '🪿',
  '🦭',
  '🦈',
  '🐋',
  '🦑',
  '🐌',
  '🦗',
  '🪲',
  '🦋',
  '🌵',
  '🍄',
  '🌸',
  '🌺',
  '🪻',
  '🌻',
  '🌙',
  '⭐',
  '🔮',
  '🎯',
  '🎲',
  '🎪',
  '🎨',
  '🎭',
  '🎺',
  '🎸',
  '🚀',
  '🛸',
  '⚡️',
  '🔥',
  '💎',
  '🏆',
  '🎖️',
  '👑',
] as const;

export { COLORS, CONFIG, USER_EMOJIS, USERNAME_MAX_LENGTH };
