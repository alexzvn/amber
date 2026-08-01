---
name: ts-no-null-prefer-undefined
description: "Use `undefined` instead of `null` for absent values in TypeScript"
condition: ["ref<[^>]*>\\(\\s*null\\s*\\)", "\\|\\s*null\\b", ":\\s*null\\b", "=\\s*null\\b", "===?\\s*null\\b"]
scope: ["tool:write(*.ts)", "tool:write(*.tsx)", "tool:write(*.vue)", "tool:edit(*.ts)", "tool:edit(*.tsx)", "tool:edit(*.vue)"]
---

Prefer `undefined` over `null` for absent/empty values. Reserve `null` only for external contracts (APIs, libraries) that mandate it. Keep one absent-value convention in the codebase — mixing `null` and `undefined` forces callers to check both.
