/**
 * Security Middleware - Input Validation
 *
 * Provides defense-in-depth against known vulnerabilities:
 * - JSONPath injection (CVE-2024-xxxx in jsonpath-plus)
 * - Prototype pollution (CVE in tough-cookie, qs)
 * - Path traversal attacks
 *
 * Red Hat Best Practice: Implement compensating controls while planning
 * migration to secure dependencies.
 */

const SUSPICIOUS_PATTERNS = [
  // JSONPath injection patterns
  { pattern: /\$\.\./, name: 'JSONPath Traversal', severity: 'HIGH' },
  { pattern: /\$\[.*\]\[.*\]/, name: 'JSONPath Deep Access', severity: 'MEDIUM' },

  // Prototype pollution patterns
  { pattern: /__proto__/, name: 'Prototype Pollution (__proto__)', severity: 'CRITICAL' },
  { pattern: /constructor/, name: 'Prototype Pollution (constructor)', severity: 'CRITICAL' },
  { pattern: /prototype/, name: 'Prototype Pollution (prototype)', severity: 'HIGH' },

  // Path traversal
  { pattern: /\.\.\//, name: 'Path Traversal', severity: 'HIGH' },
  { pattern: /\.\.\\/, name: 'Path Traversal (Windows)', severity: 'HIGH' },

  // Command injection
  { pattern: /[;&|`$]/, name: 'Command Injection Characters', severity: 'HIGH' },

  // SQL injection basics (defense in depth)
  { pattern: /(\bOR\b|\bAND\b).*=/, name: 'SQL Injection Pattern', severity: 'MEDIUM' },

  // Script injection
  { pattern: /<script|javascript:|onerror=/i, name: 'Script Injection', severity: 'HIGH' },
];

/**
 * Validates input against suspicious patterns
 * @param {string} key - Parameter name
 * @param {any} value - Parameter value
 * @returns {Object|null} - Detection object if suspicious, null if safe
 */
function validateInput(key, value) {
  if (typeof value !== 'string') {
    return null;
  }

  for (const { pattern, name, severity } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(value)) {
      return {
        key,
        value,
        pattern: pattern.toString(),
        detection: name,
        severity,
        timestamp: new Date().toISOString()
      };
    }
  }

  return null;
}

/**
 * Express middleware for input validation
 */
function securityMiddleware(req, res, next) {
  const allParams = {
    ...req.query,
    ...req.params,
    ...req.body
  };

  const detections = [];

  // Validate all parameters
  for (const [key, value] of Object.entries(allParams)) {
    const detection = validateInput(key, value);
    if (detection) {
      detections.push(detection);
    }
  }

  // If suspicious patterns detected, block and log
  if (detections.length > 0) {
    const criticalDetections = detections.filter(d => d.severity === 'CRITICAL');
    const highDetections = detections.filter(d => d.severity === 'HIGH');

    console.warn('🚨 SECURITY: Suspicious input detected', {
      url: req.url,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      detections,
      userAgent: req.get('user-agent')
    });

    // Block critical and high severity
    if (criticalDetections.length > 0 || highDetections.length > 0) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious patterns',
        timestamp: new Date().toISOString()
      });
    }

    // Log but allow medium severity (could be false positives)
    console.log('⚠️  SECURITY: Medium severity detection, allowing request');
  }

  next();
}

module.exports = securityMiddleware;
