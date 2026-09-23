import { computeSecurityScore } from "./scoring";
import {
  AuditFinding,
  AuditInput,
  AuditProvider,
  AuditResult,
  Severity,
} from "./types";

/**
 * Mock AI provider: a deterministic keyword/regex scanner.
 * Every rule returns line-specific findings in the strict AuditResult JSON.
 * Scoring rules live in ./scoring (shared with the LLM providers).
 */

interface Rule {
  ruleId: string;
  category: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
  buildFix?: (line: string) => string;
  /** Optional semantic guard on top of the regex match. */
  verify?: (line: string) => boolean;
}

const RULES: Rule[] = [
  {
    ruleId: "SL-001",
    category: "A03:2021 - Injection",
    severity: "CRITICAL",
    pattern: /\beval\s*\(/,
    message:
      "Use of eval() executes arbitrary code and enables code injection attacks.",
    buildFix: (line) =>
      line.replace(/\beval\s*\(/, "/* avoid eval */ JSON.parse("),
  },
  {
    ruleId: "SL-002",
    category: "A03:2021 - Injection",
    severity: "CRITICAL",
    pattern: /SELECT\s+\*\s+FROM\b[\s\S]*?WHERE\b/i,
    verify: (line) =>
      // Only flag string-built queries: concatenation, interpolation, or f-strings.
      /['"`]\s*\+|\+\s*['"`]|\$\{|f["'].*\{.*\}.*["']|%\s*\w|%s/i.test(line),
    message:
      "SQL query appears to be built via string concatenation/interpolation — SQL injection risk.",
    buildFix: (line) =>
      `// use parameterized query instead\n${line.replace(
        /(['"`])\s*\+|\+\s*(['"`])|\$\{[^}]*\}/g,
        "?"
      )}`,
  },
  {
    ruleId: "SL-003",
    category: "A07:2021 - Identification and Authentication Failures",
    severity: "HIGH",
    pattern: /\b(password|passwd|pwd|secret|api[_-]?key)\b\s*[:=]\s*['"][^'"]+['"]/i,
    message: "Hardcoded credential detected — secrets must not live in source code.",
    buildFix: (line) =>
      line.replace(
        /(['"][^'"]+['"])/,
        'process.env.SECRET_VALUE /* move to env/secret manager */'
      ),
  },
  {
    ruleId: "SL-004",
    category: "A03:2021 - Injection",
    severity: "HIGH",
    pattern: /dangerouslySetInnerHTML/,
    message:
      "dangerouslySetInnerHTML can lead to XSS unless the input is sanitized.",
    buildFix: (line) =>
      line.replace(
        /dangerouslySetInnerHTML/,
        "dangerouslySetInnerHTML={{ __html: sanitize(html) }} /* sanitized */"
      ),
  },
  {
    ruleId: "SL-005",
    category: "A05:2021 - Security Misconfiguration",
    severity: "MEDIUM",
    pattern: /\b(document\.write|innerHTML\s*=)\b/,
    message: "Direct HTML injection sink detected — sanitize before rendering.",
  },
  {
    ruleId: "SL-006",
    category: "A02:2021 - Cryptographic Failures",
    severity: "HIGH",
    pattern: /\b(md5|sha1)\s*\(/i,
    message:
      "MD5/SHA-1 are broken hash algorithms — use SHA-256 or stronger for security purposes.",
  },
  {
    ruleId: "SL-007",
    category: "A04:2021 - Insecure Design",
    severity: "LOW",
    pattern: /console\.(log|debug|info)\s*\(/,
    message:
      "Debug logging left in code — may leak sensitive data in production builds.",
  },
];

function scanLine(line: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const rule of RULES) {
    const match = rule.pattern.exec(line);
    if (!match) continue;
    if (rule.verify && !rule.verify(line)) continue;

    findings.push({
      ruleId: rule.ruleId,
      message: rule.message,
      line: 0, // filled by caller
      column: match.index + 1,
      endLine: null,
      severity: rule.severity,
      category: rule.category,
      snippet: line.trim(),
      suggestedFix: rule.buildFix ? rule.buildFix(line) : null,
    });
  }

  return findings;
}

/** The mock provider used as MVP default and as fallback for openai/claude. */
export class MockAuditProvider implements AuditProvider {
  readonly name = "mock";

  async audit({ code }: AuditInput): Promise<AuditResult> {
    const lines = code.split(/\r?\n/);
    const findings: AuditFinding[] = [];

    lines.forEach((line, index) => {
      for (const finding of scanLine(line)) {
        findings.push({ ...finding, line: index + 1 });
      }
    });

    return {
      findings,
      securityScore: computeSecurityScore(findings),
    };
  }
}
