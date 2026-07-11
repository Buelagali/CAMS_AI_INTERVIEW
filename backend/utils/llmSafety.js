const logger = require('./logger');

const INJECTION_PATTERNS = [
  /ignore\s+(above|previous|all|the\s+above)/i,
  /forget\s+(above|previous|all)/i,
  /disregard\s+(above|previous|all)/i,
  /system\s+(prompt|instruction|message)/i,
  /you\s+are\s+(now|not\s+required)/i,
  /act\s+as\s+(if|though)/i,
  /pretend/i,
  /bypass/i,
  /override/i,
  /jailbreak/i,
  /do\s+not\s+(follow|obey|adhere)/i,
  /new\s+(prompt|instruction|task)/i,
  /role\s*(play|:)/i,
  /```[\s\S]*```/,
  /<\s*(system|user|assistant|prompt)\s*>/i,
];

const UNSAFE_PATTERNS = [
  /(how\s+to\s+)?(hack|crack|exploit|bypass|cheat)/i,
  /(malicious|malware|virus|ransomware|trojan)/i,
  /(steal|theft|fraud|scam)/i,
  /(bomb|weapon|explosive|attack)/i,
  /(suicide|self[\s-]harm|harm\s+(yourself|myself))/i,
  /(discriminate|racist|sexist|offensive)/i,
  /(illegal\s+(drug|substance|activity))/i,
];

const MAX_TOKEN_LENGTH = 4096;
const MAX_INPUT_LENGTH = 100000;

function sanitizeInput(text) {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .substring(0, MAX_INPUT_LENGTH);
}

function detectPromptInjection(text) {
  if (!text) return { detected: false, score: 0, matches: [] };
  const matches = [];
  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0].substring(0, 100));
    }
  }
  const score = matches.length > 0 ? Math.min(1, matches.length * 0.25) : 0;
  const detected = score >= 0.25;
  if (detected) {
    logger.warn('system', 'Prompt injection detected', { patterns: matches, inputLength: text.length });
  }
  return { detected, score, matches };
}

function validateOutput(text) {
  if (!text) return { safe: true, issues: [] };
  const issues = [];

  if (text.length > MAX_TOKEN_LENGTH * 4) {
    issues.push('output_exceeds_max_length');
  }

  try {
    JSON.parse(text);
  } catch {
    if (text.includes('{') && text.includes('}')) {
      const hasValidJson = text.includes('"') && text.includes(':');
      if (!hasValidJson) {
        issues.push('invalid_json_structure');
      }
    }
  }

  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(text)) {
      issues.push('unsafe_content_detected');
      break;
    }
  }

  if (issues.length > 0) {
    logger.warn('system', 'Output validation issues', { issues, outputLength: text.length });
  }

  return { safe: issues.length === 0, issues };
}

function validateAndRepairJSON(raw) {
  if (!raw) return { valid: false, data: null, error: 'empty_output' };

  try {
    const parsed = JSON.parse(raw);
    return { valid: true, data: parsed, error: null };
  } catch (e) {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.warn('system', 'JSON extracted via regex repair');
        return { valid: true, data: parsed, error: null };
      } catch { }
    }

    const lines = raw.split('\n').filter(l => l.trim());
    const obj = {};
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim().replace(/^["']|["']$/g, '');
        let value = line.substring(colonIdx + 1).trim().replace(/,$/, '');
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (key && value) {
          obj[key] = value;
        }
      }
    }
    if (Object.keys(obj).length > 0) {
      logger.warn('system', 'JSON reconstructed from key:value lines');
      return { valid: true, data: obj, error: null };
    }

    return { valid: false, data: null, error: e.message };
  }
}

function truncateToTokenLimit(text, maxTokens = MAX_TOKEN_LENGTH) {
  if (!text) return '';
  const approxTokens = Math.ceil(text.length / 4);
  if (approxTokens <= maxTokens) return text;
  return text.substring(0, maxTokens * 4) + '\n[truncated]';
}

module.exports = {
  sanitizeInput,
  detectPromptInjection,
  validateOutput,
  validateAndRepairJSON,
  truncateToTokenLimit,
  INJECTION_PATTERNS,
  UNSAFE_PATTERNS,
};
