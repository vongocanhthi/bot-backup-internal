import { HttpError } from './http-error'

export type SecretHit = { rule: string; label: string }

const RULES: { rule: string; label: string; pattern: RegExp }[] = [
  { rule: 'private-key', label: 'khóa riêng PEM', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { rule: 'aws-access-key', label: 'khóa AWS', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { rule: 'github-token', label: 'token GitHub', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { rule: 'slack-token', label: 'token Slack', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { rule: 'provider-key', label: 'khóa dạng sk-', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { rule: 'backup-key', label: 'khóa sao lưu', pattern: /\bbbk_[A-Za-z0-9_-]{20,}\b/ },
  { rule: 'bearer', label: 'mã Bearer', pattern: /\bBearer\s+[A-Za-z0-9_\-.=]{20,}/i },
  {
    rule: 'assignment',
    label: 'giá trị mật khẩu hoặc token',
    pattern: /\b(api[_-]?key|secret|token|password|passwd|authorization)\b\s*[:=]\s*['"]?[A-Za-z0-9_\-./+=]{12,}/i,
  },
]

export function scanSecrets(text: string): SecretHit[] {
  const hits: SecretHit[] = []
  const seen = new Set<string>()
  for (const rule of RULES) {
    if (seen.has(rule.rule)) continue
    if (rule.pattern.test(text)) {
      seen.add(rule.rule)
      hits.push({ rule: rule.rule, label: rule.label })
    }
  }
  return hits
}

export function assertNoSecrets(text: string) {
  const hits = scanSecrets(text)
  if (hits.length === 0) return
  throw new HttpError(`Nội dung có vẻ chứa bí mật (${hits.map((hit) => hit.label).join(', ')}). Hãy xóa trước khi tải lên.`, 400)
}
