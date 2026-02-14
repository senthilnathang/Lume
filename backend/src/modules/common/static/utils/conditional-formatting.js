/**
 * Conditional Formatting Utility
 *
 * Provides functions for evaluating conditions and applying styles
 * to dashboard widgets based on configurable rules.
 */

// Color presets for common formatting scenarios
export const COLOR_PRESETS = {
  traffic_light: {
    danger: { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' },
    warning: { backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 'normal' },
    success: { backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 'bold' },
  },
  heat_map: {
    cold: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    neutral: { backgroundColor: '#f3f4f6', color: '#374151' },
    hot: { backgroundColor: '#fee2e2', color: '#dc2626' },
  },
  progress: {
    low: { backgroundColor: '#fee2e2', color: '#dc2626' },
    medium: { backgroundColor: '#fef3c7', color: '#d97706' },
    high: { backgroundColor: '#bbf7d0', color: '#16a34a' },
    complete: { backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold' },
  },
  status: {
    draft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
    pending: { backgroundColor: '#fef3c7', color: '#d97706' },
    approved: { backgroundColor: '#dcfce7', color: '#16a34a' },
    rejected: { backgroundColor: '#fee2e2', color: '#dc2626' },
  },
  priority: {
    low: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    medium: { backgroundColor: '#fef3c7', color: '#d97706' },
    high: { backgroundColor: '#fed7aa', color: '#ea580c' },
    critical: { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' },
  },
};

// Default thresholds for traffic light preset
export const TRAFFIC_LIGHT_THRESHOLDS = {
  danger: { max: 33 },
  warning: { min: 33, max: 66 },
  success: { min: 66 },
};

// Default thresholds for progress preset
export const PROGRESS_THRESHOLDS = {
  low: { max: 25 },
  medium: { min: 25, max: 50 },
  high: { min: 50, max: 100 },
  complete: { min: 100 },
};

/**
 * Evaluate a single condition against a value
 * @param {any} value - The value to evaluate
 * @param {Object} condition - The condition to check
 * @returns {boolean} - Whether the condition is met
 */
export function evaluateCondition(value, condition) {
  const { operator, value: threshold, value2 } = condition;

  // Handle null/undefined values
  if (value === null || value === undefined) {
    return operator === 'is_null' || operator === 'IS NULL';
  }

  // Normalize value for comparison
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const isNumeric = !isNaN(numericValue);

  switch (operator) {
    case '=':
    case '==':
    case 'equals':
      return value === threshold || (isNumeric && numericValue === threshold);

    case '!=':
    case '<>':
    case 'not_equals':
      return value !== threshold && (!isNumeric || numericValue !== threshold);

    case '>':
    case 'greater_than':
      return isNumeric && numericValue > threshold;

    case '>=':
    case 'greater_than_or_equal':
      return isNumeric && numericValue >= threshold;

    case '<':
    case 'less_than':
      return isNumeric && numericValue < threshold;

    case '<=':
    case 'less_than_or_equal':
      return isNumeric && numericValue <= threshold;

    case 'between':
    case 'BETWEEN':
      return isNumeric && numericValue >= threshold && numericValue <= value2;

    case 'not_between':
      return isNumeric && (numericValue < threshold || numericValue > value2);

    case 'contains':
    case 'LIKE':
      return String(value).toLowerCase().includes(String(threshold).toLowerCase());

    case 'not_contains':
      return !String(value).toLowerCase().includes(String(threshold).toLowerCase());

    case 'starts_with':
      return String(value).toLowerCase().startsWith(String(threshold).toLowerCase());

    case 'ends_with':
      return String(value).toLowerCase().endsWith(String(threshold).toLowerCase());

    case 'in':
    case 'IN':
      return Array.isArray(threshold) ? threshold.includes(value) : false;

    case 'not_in':
    case 'NOT IN':
      return Array.isArray(threshold) ? !threshold.includes(value) : true;

    case 'is_null':
    case 'IS NULL':
      return value === null || value === undefined;

    case 'is_not_null':
    case 'IS NOT NULL':
      return value !== null && value !== undefined;

    case 'is_empty':
      return value === '' || (Array.isArray(value) && value.length === 0);

    case 'is_not_empty':
      return value !== '' && !(Array.isArray(value) && value.length === 0);

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Get the style for a value based on conditional formatting config
 * @param {any} value - The value to style
 * @param {Object} formattingConfig - The conditional formatting configuration
 * @returns {Object|null} - The style object or null if no conditions match
 */
export function getConditionalStyle(value, formattingConfig) {
  if (!formattingConfig || !formattingConfig.enabled) {
    return null;
  }

  // Handle preset-based formatting
  if (formattingConfig.preset) {
    return getPresetStyle(value, formattingConfig.preset, formattingConfig.thresholds);
  }

  // Handle rule-based formatting
  const rules = formattingConfig.rules || [];

  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules].sort((a, b) => (a.priority || 999) - (b.priority || 999));

  for (const rule of sortedRules) {
    const fieldValue = rule.field ? getNestedValue(value, rule.field) : value;
    const conditions = rule.conditions || [];

    for (const condition of conditions) {
      if (evaluateCondition(fieldValue, condition)) {
        return condition.style || {};
      }
    }
  }

  return null;
}

/**
 * Get style based on a preset and thresholds
 * @param {number} value - The numeric value
 * @param {string} presetName - The preset name
 * @param {Object} thresholds - Custom thresholds (optional)
 * @returns {Object|null} - The style object
 */
export function getPresetStyle(value, presetName, thresholds = null) {
  const preset = COLOR_PRESETS[presetName];
  if (!preset) {
    console.warn(`Unknown preset: ${presetName}`);
    return null;
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numericValue)) {
    return null;
  }

  // Use default thresholds if not provided
  const effectiveThresholds = thresholds || getDefaultThresholds(presetName);

  // Find matching threshold level
  for (const [level, range] of Object.entries(effectiveThresholds)) {
    const minCheck = range.min === undefined || numericValue >= range.min;
    const maxCheck = range.max === undefined || numericValue < range.max;

    if (minCheck && maxCheck && preset[level]) {
      return preset[level];
    }
  }

  return null;
}

/**
 * Get default thresholds for a preset
 * @param {string} presetName - The preset name
 * @returns {Object} - The default thresholds
 */
function getDefaultThresholds(presetName) {
  switch (presetName) {
    case 'traffic_light':
      return TRAFFIC_LIGHT_THRESHOLDS;
    case 'progress':
      return PROGRESS_THRESHOLDS;
    case 'heat_map':
      return {
        cold: { max: 33 },
        neutral: { min: 33, max: 66 },
        hot: { min: 66 },
      };
    default:
      return {};
  }
}

/**
 * Get nested value from an object using dot notation
 * @param {Object} obj - The source object
 * @param {string} path - The dot-notation path
 * @returns {any} - The value at the path
 */
function getNestedValue(obj, path) {
  if (!path || typeof obj !== 'object') {
    return obj;
  }

  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

/**
 * Apply conditional formatting to table column configuration
 * @param {Object} column - The table column config
 * @param {Object} formattingConfig - The conditional formatting config
 * @returns {Object} - The enhanced column config with customRender
 */
export function applyTableColumnFormatting(column, formattingConfig) {
  if (!formattingConfig || !formattingConfig.enabled) {
    return column;
  }

  const originalRender = column.customRender;

  return {
    ...column,
    customRender: ({ text, record }) => {
      const value = text !== undefined ? text : record[column.dataIndex];
      const style = getConditionalStyle(value, formattingConfig);

      // If original render exists, wrap it
      const content = originalRender
        ? originalRender({ text, record })
        : value;

      if (style) {
        return {
          children: content,
          props: {
            style,
          },
        };
      }

      return content;
    },
  };
}

/**
 * Get chart series colors based on conditional formatting
 * @param {Array} dataPoints - The data points
 * @param {Object} formattingConfig - The conditional formatting config
 * @param {string} defaultColor - The default color to use
 * @returns {Array} - Array of colors for each data point
 */
export function getChartColors(dataPoints, formattingConfig, defaultColor = '#1890ff') {
  if (!formattingConfig || !formattingConfig.enabled || !Array.isArray(dataPoints)) {
    return dataPoints.map(() => defaultColor);
  }

  return dataPoints.map((point) => {
    const value = typeof point === 'object' ? point.value : point;
    const style = getConditionalStyle(value, formattingConfig);
    return style?.backgroundColor || style?.color || defaultColor;
  });
}

/**
 * Get KPI card style based on value and formatting config
 * @param {number} value - The KPI value
 * @param {Object} formattingConfig - The conditional formatting config
 * @returns {Object} - Style object for the KPI card
 */
export function getKpiCardStyle(value, formattingConfig) {
  if (!formattingConfig || !formattingConfig.enabled) {
    return {};
  }

  const style = getConditionalStyle(value, formattingConfig);
  if (!style) {
    return {};
  }

  // Convert to card-appropriate styles
  return {
    valueStyle: {
      color: style.color,
      fontWeight: style.fontWeight,
    },
    cardStyle: {
      backgroundColor: style.backgroundColor,
      borderColor: style.color,
    },
  };
}

/**
 * Create formatting config from simple threshold configuration
 * @param {Object} thresholds - Object with threshold values
 * @param {string} preset - Optional preset to use for colors
 * @returns {Object} - Full formatting config
 */
export function createFormattingFromThresholds(thresholds, preset = 'traffic_light') {
  const presetColors = COLOR_PRESETS[preset] || COLOR_PRESETS.traffic_light;
  const levels = Object.keys(presetColors);

  const rules = [{
    id: 'auto_threshold',
    field: 'value',
    priority: 1,
    conditions: levels.map((level, index) => {
      const threshold = thresholds[level];
      if (threshold === undefined) {
        return null;
      }

      return {
        operator: index === levels.length - 1 ? '>=' : '<',
        value: threshold,
        style: presetColors[level],
      };
    }).filter(Boolean),
  }];

  return {
    enabled: true,
    rules,
  };
}

/**
 * Validate a formatting configuration
 * @param {Object} config - The formatting config to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateFormattingConfig(config) {
  const errors = [];

  if (!config) {
    return { valid: true, errors: [] };
  }

  if (config.preset && !COLOR_PRESETS[config.preset]) {
    errors.push(`Unknown preset: ${config.preset}`);
  }

  if (config.rules && Array.isArray(config.rules)) {
    config.rules.forEach((rule, ruleIndex) => {
      if (!rule.conditions || !Array.isArray(rule.conditions)) {
        errors.push(`Rule ${ruleIndex}: Missing conditions array`);
        return;
      }

      rule.conditions.forEach((cond, condIndex) => {
        if (!cond.operator) {
          errors.push(`Rule ${ruleIndex}, Condition ${condIndex}: Missing operator`);
        }
        if (cond.style && typeof cond.style !== 'object') {
          errors.push(`Rule ${ruleIndex}, Condition ${condIndex}: Invalid style object`);
        }
      });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  COLOR_PRESETS,
  TRAFFIC_LIGHT_THRESHOLDS,
  PROGRESS_THRESHOLDS,
  evaluateCondition,
  getConditionalStyle,
  getPresetStyle,
  applyTableColumnFormatting,
  getChartColors,
  getKpiCardStyle,
  createFormattingFromThresholds,
  validateFormattingConfig,
};
