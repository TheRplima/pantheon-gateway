# TOOLS.md - Local Notes

<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

<!-- :::immutable -->
> [!CAUTION]
> **CREDENTIAL EXPOSURE HAZARD**
> Nunca salve senhas, tokens de API ou chaves privadas neste arquivo.
> Use `governance/SECURITY_POLICY.md` para entender como o Orchestrator gerencia segredos via env-vars.
<!-- ::: -->
