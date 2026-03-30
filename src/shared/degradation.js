// ─────────────────────────────────────────────────
// Degradation Engine — applies penalty and cap logic
// ─────────────────────────────────────────────────
import {
  TRIGGER_CONFIDENCE_MAP,
  ConfidenceLevel,
  ConfidenceImpact,
  DegradationTrigger,
} from './constants.js';

/**
 * Given a list of degradation trigger codes, compute the penalty coefficient
 * and cap limit for the overall score.
 * @param {string[]} triggers - Array of DegradationTrigger codes
 * @returns {{ penaltyCoefficient: number, capLimit: number }}
 */
export function computeDegradation(triggers) {
  if (!triggers || triggers.length === 0) {
    return { penaltyCoefficient: 1.0, capLimit: 100 };
  }

  const levels = triggers.map(t => TRIGGER_CONFIDENCE_MAP[t]).filter(Boolean);
  const hasLow = levels.includes(ConfidenceLevel.LOW);
  const hasMedium = levels.includes(ConfidenceLevel.MEDIUM);

  if (hasLow) {
    return { penaltyCoefficient: 0.80, capLimit: 70 };
  }
  if (hasMedium) {
    return { penaltyCoefficient: 0.90, capLimit: 85 };
  }
  return { penaltyCoefficient: 1.0, capLimit: 100 };
}

/**
 * Apply penalty and cap to a raw score.
 * @param {number} rawScore - Raw aggregated score (0–100)
 * @param {{ penaltyCoefficient: number, capLimit: number }} degradation
 * @returns {number}
 */
export function applyPenalty(rawScore, { penaltyCoefficient, capLimit }) {
  return Math.min(
    Math.round(rawScore * penaltyCoefficient),
    capLimit
  );
}

/**
 * Determine which triggers are relevant for a specific breakdown item.
 * @param {string} itemName
 * @param {string[]} allTriggers
 * @returns {string[]}
 */
export function getTriggersForItem(itemName, allTriggers) {
  // Global triggers affect all items
  const globalTriggers = [
    DegradationTrigger.MODEL_NO_OUTPUT,
    DegradationTrigger.MODEL_TRUNCATED,
  ];

  // Item-specific mapping
  const itemTriggerMap = {
    'Skills & Experience Relevance': [
      DegradationTrigger.FIELD_MISSING_RESUME,
      DegradationTrigger.FIELD_MISSING_JD,
      DegradationTrigger.FIELD_MISSING_BOTH,
      DegradationTrigger.MODEL_FIELD_MISSING,
      DegradationTrigger.MODEL_NO_EVIDENCE,
    ],
    'Responsibility Coverage': [
      DegradationTrigger.FIELD_MISSING_RESUME,
      DegradationTrigger.FIELD_MISSING_JD,
      DegradationTrigger.FIELD_MISSING_BOTH,
      DegradationTrigger.REF_LOCATE_FAIL,
      DegradationTrigger.MODEL_FIELD_MISSING,
      DegradationTrigger.MODEL_NO_EVIDENCE,
    ],
    'Years of Experience': [
      DegradationTrigger.FIELD_MISSING_RESUME,
      DegradationTrigger.FIELD_MISSING_JD,
      DegradationTrigger.FIELD_MISSING_BOTH,
      DegradationTrigger.MODEL_FIELD_MISSING,
    ],
    'Education & Certifications': [
      DegradationTrigger.FIELD_MISSING_RESUME,
      DegradationTrigger.FIELD_MISSING_JD,
      DegradationTrigger.FIELD_MISSING_BOTH,
      DegradationTrigger.MODEL_FIELD_MISSING,
    ],
    'Language & Location': [
      DegradationTrigger.PARSE_CONFLICT_LANG,
      DegradationTrigger.PARSE_CONFLICT_LOC,
      DegradationTrigger.FIELD_MISSING_RESUME,
      DegradationTrigger.FIELD_MISSING_JD,
      DegradationTrigger.MODEL_FIELD_MISSING,
    ],
    'Sponsorship Fit': [
      DegradationTrigger.SPONSOR_DATA_UNAVAIL,
      DegradationTrigger.MODEL_FIELD_MISSING,
    ],
  };

  const relevantCodes = [
    ...globalTriggers,
    ...(itemTriggerMap[itemName] || []),
  ];

  return allTriggers.filter(t => relevantCodes.includes(t));
}

/**
 * Generate a degradation evidence note for appending to a breakdown item.
 * @param {string} triggerCode
 * @returns {string}
 */
export function buildDegradationEvidence(triggerCode) {
  const descriptions = {
    [DegradationTrigger.FIELD_MISSING_RESUME]: '简历缺失关键字段',
    [DegradationTrigger.FIELD_MISSING_JD]:     'JD 缺失关键字段',
    [DegradationTrigger.FIELD_MISSING_BOTH]:   '简历和 JD 同时缺失关键字段',
    [DegradationTrigger.REF_LOCATE_FAIL]:      '无法定位证据引用片段',
    [DegradationTrigger.PARSE_CONFLICT_LANG]:  '语言要求解析冲突',
    [DegradationTrigger.PARSE_CONFLICT_LOC]:   '地点信息前后矛盾',
    [DegradationTrigger.MODEL_NO_OUTPUT]:      'LLM 未返回有效输出',
    [DegradationTrigger.MODEL_FIELD_MISSING]:  'LLM 输出缺失关键字段',
    [DegradationTrigger.MODEL_TRUNCATED]:      'LLM 输出被截断',
    [DegradationTrigger.MODEL_NO_EVIDENCE]:    'LLM 未输出证据内容',
    [DegradationTrigger.SPONSOR_DATA_UNAVAIL]: '无法获取 IND 注册数据',
    [DegradationTrigger.JD_EXTRACT_FAIL]:      'JD 文本提取失败',
    [DegradationTrigger.RESUME_PARSE_FAIL]:    '简历文件解析失败',
  };

  return `[CONFIDENCE-DEGRADED] 触发条件: ${triggerCode}; 原因: ${descriptions[triggerCode] || '未知'}`;
}
