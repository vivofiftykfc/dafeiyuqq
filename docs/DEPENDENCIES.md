# 依赖与安装位置

按需安装，不必为了QQ文字聊天下载全部模型。以下版本/文件名来自本工程整理时的本机配置，不承诺与未来上游版本自动兼容。

## 基础链路

| 依赖 | 来源 | 位置/要求 | 验证 |
|---|---|---|---|
| Git | [官方](https://git-scm.com/) | 系统可执行文件 | `git --version` |
| Node.js | [官方](https://nodejs.org/) | 24+；本机使用SnowLuma自带24.22.1 | `node --version`；必须有 `node:sqlite` |
| QQ NT | [官方](https://im.qq.com/) | 自己的小号登录 | 网关回读账号正确 |
| SnowLuma | [发布页](https://github.com/SnowLuma/SnowLuma/releases) | 本机2.1.1完整包，解压至项目 `snowluma` | 5099管理页，3000 HTTP，3001 WS |
| DeepSeek Harness | [官方仓库](https://github.com/deepseek-ai/deepseek-harness) | 单独安装；路径用 `--dsh-root` 设置 | 专用profile `dafeiyuqq`，18031 |
| 桥接npm包 | `qq-bridge/package-lock.json` | `npm ci --prefix qq-bridge` | `npm test` |
| 共享工具 | `tutorial-kit/package-lock.json` | `npm ci --prefix tutorial-kit` | 日记/手机模块导入正常 |

桥接直接依赖包括DSH host代理、MCP SDK、SnowLuma SDK/MCP、js-yaml、zod；完整解析版本以锁文件为准。`npm install`会重新解析版本，复现时优先 `npm ci`。桥接postinstall会运行保留的上游SDK扩展名修补脚本，避免Node ESM导入失败。

## 抖音

源码和已构建的SDK在 `tools/douyin-im`，原始项目为 [zhinjs/douyin-im](https://github.com/zhinjs/douyin-im)，保留MIT许可。

```powershell
npm ci --prefix tools/douyin-im --ignore-scripts
```

确认存在 `tools/douyin-im/lib/index.js`。协议登录/会话和允许联系人在本机建立，不随仓库提供。先连接，再在控制台逐人启用；新增联系人不默认回复。协议状态随平台变化，不能把某次连通视作永久兼容。

需要从源码重新构建SDK时，执行 `npm run build --prefix tools/douyin-im`。构建工具、协议文件、`src/base/runtime` 和浏览器资产许可均随包提供；不要将这些代码目录误当作个人运行缓存排除。CI会在Windows上独立验证该构建。

## ComfyUI生图（可选）

1. 从 [ComfyUI官方](https://github.com/Comfy-Org/ComfyUI) 安装Windows环境，确认NVIDIA驱动和所配PyTorch能使用CUDA。
2. 安装 [ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF) 节点，并在ComfyUI自己的Python里安装其requirements。
3. 确认当前ComfyUI具有 `TextEncodeQwenImage21`、`CLIPLoader`、`VAELoader` 等工作流节点。旧版本不具备时先按官方升级，不随意换同名节点。
4. 本机工作流使用以下文件，下载时遵循模型发布者的许可和校验信息：

| 文件 | ComfyUI下的位置 |
|---|---|
| `qwen-image-2.1-UC-Q6_K.gguf` | `models/diffusion_models/` |
| `qwen3vl_8b_int8_convrot.safetensors` | `models/text_encoders/` |
| `qwen_image_2.1_vae_bf16.safetensors` | `models/vae/` |

模型不在本仓库中。通过配置的ComfyUI Python启动 `ComfyUI/main.py --listen 127.0.0.1 --port 8188`。具体便携环境路径在初始化时用 `--comfy-root` 设置。

角色一致性另外需要你自己的 `assets/identity/manifest.json`、参考PNG和SHA-256，见 `examples/identity.manifest.example.json`。未经授权的真人照片不要作为公开默认素材。生成任务完成后再回传图片；显存不足时串行使用生图和TTS。

## Qwen3-TTS（可选）

服务源码在 `services/voice/qwen3`，上游为 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)。本机环境使用Python 3.12、CUDA PyTorch。`requirements.txt` 列出主要依赖；`requirements.lock.txt` 是整理时安装环境的完整版本快照，已移除本机wheel路径，供复现对照。GPU依赖应按官方PyTorch源安装配套版本，不能保证该完整快照适合其他显卡。

```powershell
py -3.12 -m venv services\voice\qwen3\venv
# 先按PyTorch官方说明安装匹配GPU/驱动的torch、torchaudio
services\voice\qwen3\venv\Scripts\python.exe -m pip install -r services\voice\qwen3\requirements.txt
```

模型下载清单 `download-manifest.json` 固定了 `Qwen3-TTS-12Hz-1.7B-Base` 与 `Qwen3-TTS-12Hz-1.7B-VoiceDesign` 的revision、文件长度及可核验的权重SHA-256。可以执行下面的下载与检查步骤；网络必须能访问Hugging Face，失败时先看日志，不跳过哈希校验：

```powershell
$voicePython = 'services/voice/qwen3/venv/Scripts/python.exe'
& $voicePython services/voice/qwen3/download.py
& $voicePython services/voice/qwen3/validate-models.py
& $voicePython services/voice/qwen3/worker.py --design
Copy-Item examples/preferences.example.json services/voice/qwen3/preferences.json
& $voicePython services/voice/qwen3/server.py
```

`worker.py --design` 会在本机生成三种原创参考音色和 `voices.json`，不会发送语音；已有音色时保留原件。也可准备自己获授权的参考音频，按 `examples/voices.example.json` 填写实际音频路径和准确朗读文本。`validate-models.py` 通过后才生成 `models-ready.json`。不要手工创建空的ready标记，不要把参考音频、访问令牌或生成语音提交Git。

初始化默认语音根目录是项目下 `services/voice`；复用已有外置环境时加 `--voice-root "D:/YourVoiceRoot"`。服务端口18034，本地访问令牌由服务生成。必须实际生成并试听、查询任务完成后，才能验收语音模块。

## Android手机（可选）

- 从 [Android官方](https://developer.android.com/tools/releases/platform-tools)下载platform-tools至 `tools/platform-tools`。
- 在手机开启开发者选项/USB调试，由本人确认USB授权；`adb devices` 应显示 `device`。
- 手机工具位于 `tutorial-kit/packages/phone-mcp`。中文输入需要按该模块说明安装ADBKeyboard并验证实际输入。
- 用自己的序列号和工具路径创建 `qq-bridge/state/owner/phone.json`，参考 `examples/phone.example.json`。FFmpeg单独安装，并将路径填入同一配置。
- 使用截图/界面树观察后再操作；锁屏时暂停。项目不提供解锁或账号登录绕过。

## 浏览器、SillyTavern与微信（可选）

浏览器工具使用本机Edge和Playwright：`npm ci --prefix tools/console-tests`。源码中预设了Windows标准Edge路径，非标准安装应先调整路径。

SillyTavern从 [官方仓库](https://github.com/SillyTavern/SillyTavern)单独安装，使用独立实例和数据目录，配置端口18020。不要依赖指向另一台电脑目录的 `node_modules` 链接；在目标实例里重新安装依赖。

微信还需要固定客户端版本、原生桥接后端、Python环境、MaiBot、嵌入/识别模型和独立绑定配置。详见[微信集成](WECHAT.md)。本仓库没有重新打包微信/QQ客户端、SnowLuma运行时、DSH安装程序或模型权重。
