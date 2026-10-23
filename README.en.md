<div align="center">

![Dafeiyu](assets/banner.svg)

# Dafeiyu

**A local-first companion workspace for chat, memory and tools.**

[中文](README.md) · [Quick start](docs/QUICKSTART.md) · [Dependencies](docs/DEPENDENCIES.md) · [Architecture](docs/ARCHITECTURE.md)

</div>

Dafeiyu integrates QQ, Douyin and optional native WeChat transport with DeepSeek Harness. It includes a management console, conversation-scoped SQLite memory, journals, Android MCP tools, ComfyUI image generation, and a Qwen3-TTS service adapter.

This repository ships integration source, configuration helpers, dependency declarations and documentation. It does **not** contain model weights, desktop applications, login sessions, personal identities or conversations. Reply generation uses your configured provider and may send prompts to that provider.

Start with the QQ text loop on Windows 10/11 x64 using Node.js 24+, SnowLuma and an authenticated DSH installation. Configure distinct owner and bot QQ accounts with `npm run configure -- --owner-qq YOUR_NUMBER --bot-qq BOT_NUMBER`. Read the Chinese quick-start guide before starting services.

Run `npm run check` for syntax/JSON validation and `npm test` for isolated offline suites. Optional voice, images, Android and native WeChat require separate setup. Native WeChat integration is an advanced source adapter, not a turnkey installer; client version and native backend compatibility must be verified locally.

See [contribution guidelines](CONTRIBUTING.md), [security notes](SECURITY.md), and [third-party notices](THIRD_PARTY_NOTICES.md). Project additions use MIT; upstream components retain their own licenses.
