# 脚本与依赖入口

## 日常运行

- 根目录分项CMD用于首次安装和排障；完整一键启动器用于已准备全部模块的部署。
- `scripts/start-all.ps1 -CheckOnly` 只检查依赖路径、端口和账号状态。
- `scripts/wechat-stack.ps1`、`wechat-native-runner.ps1` 从脚本所在项目推导微信目录，不依赖维护者的桌面路径。
- 桥接管理、媒体、统一记忆和微信适配器之间的项目内路径从源码位置推导。外置DSH/ComfyUI/语音环境由初始化配置指定。

## 开发检查

```powershell
npm run check       # JavaScript/JSON，以及package入口与npm命令引用的文件
npm test            # 隔离离线回归
npm run audit:source
.\scripts\check-secrets.ps1 # 完整历史扫描；需要gh可访问工具的公开Release
```

`check-entrypoints.mjs` 检查 `main/types/bin/exports` 与npm脚本中的本地文件、配置、目录和内部脚本名。`check-imports.mjs` 另查生产模块的相对导入，避免打包时漏掉子目录。它们不执行发送消息或修改账号的命令，也不能代替真实模块安装和设备验收。

源码包没有携带维护者的探测、真实账号回放和旧SAPI语音工具，对应不可用npm别名已移除。当前语音能力使用文档中的Qwen3-TTS流程。

`tools/douyin-im/scripts/build`、Jest/ESLint配置及浏览器资产许可随源码保留。安装SDK依赖后可按其manifest使用构建命令；演示账号程序没有随包分发，因此没有保留失效的demo命令。

SDK的 `src/base/runtime` 和 `lib/base/runtime` 是代码目录，必须随源码一起分发；它们与被忽略的个人运行数据目录不同。本次已在隔离目录验证SDK完整构建。

本机一次性迁移、环境修复和打包前的实际凭据逐值检查工具不随源码发布。运行中的记忆、日志、截图和迁移记录属于部署数据，不能通过复制整个工作区来更新GitHub。
