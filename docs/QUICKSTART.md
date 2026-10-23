# 快速开始：先跑通QQ文字

## 1. 准备环境

Windows 10/11 x64、Git、Node.js 24+、一个QQ小号，以及已登录或已配置模型服务的DeepSeek Harness。推荐英文且没有引号的安装路径，例如 `D:\Projects\dafeiyuqq`。本项目使用 `node:sqlite`，不要按旧教程安装Node 18/20。

从[SnowLuma官方发布页](https://github.com/SnowLuma/SnowLuma/releases)下载Windows完整包，解压到项目下 `snowluma`，确保其中有 `index.mjs`、`node.exe` 和原生组件。首次运行先阅读其EULA，并只加载你准备的机器人账号。

## 2. 下载与初始化

```powershell
git clone https://github.com/vivofiftykfc/dafeiyuqq.git D:\Projects\dafeiyuqq
Set-Location D:\Projects\dafeiyuqq
npm ci --prefix qq-bridge
npm ci --prefix tutorial-kit
npm run configure -- --owner-qq 你的QQ主号 --bot-qq 机器人QQ小号 --dsh-root "D:/APPs/dsh/DeepSeek Harness"
```

主号与机器人账号必须不同。初始化会生成被Git忽略的 `qq-bridge/config.json`、空记忆、日记设置和随机控制台令牌；不会覆盖已有配置。源码中的安装模板会替换为当前电脑路径，因此应在第一次使用前运行；换目录时请重新从干净源码初始化并迁移自己的数据，不能靠再次运行强行覆盖。

安装时会运行上游postinstall补丁 `qq-bridge/scripts/patch-snowluma-sdk.mjs`，为SnowLuma SDK中确实存在的相对导入补上 `.js` 扩展名。这是本次干净配置启动检查发现的必要步骤。若安装时使用 `--ignore-scripts`，需随后手工执行该脚本，否则Node ESM可能报 `ERR_MODULE_NOT_FOUND`。

## 3. SnowLuma与令牌

运行 `启动网关.cmd`，打开 `http://127.0.0.1:5099`，登录/加载你的小号。HTTP和WebSocket监听回环地址，默认端口分别为3000、3001。

编辑 `qq-bridge/config.json`：确认 `snowluma.homeDir` 指向当前SnowLuma目录，`accessToken` 填 **HTTP令牌**。WebSocket可能使用不同令牌；桥接会从同一安装目录发现对应配置。不要把WS令牌误填到HTTP字段。

## 4. DSH专用profile

在DSH官方安装中完成模型账号登录。用本项目独立profile启动，避免修改你原来的聊天环境：

```powershell
& 'D:\APPs\dsh\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd' --profile dafeiyuqq --host 127.0.0.1 --port 18031 --no-open
```

等待profile初始化，然后在另一个终端安装桥接预设：

```powershell
Set-Location D:\Projects\dafeiyuqq\qq-bridge
node scripts/setup-dsh.mjs dafeiyuqq
```

按脚本输出完成profile依赖安装/重启。确认 `config.json` 的 `dsh.baseUrl` 是 `http://127.0.0.1:18031`，模型provider与当前DSH实际可用的账户/服务一致。初始化默认 `deepseek-account`，使用API服务时按自己的DSH配置修改。

## 5. 启动和验收

回到项目根目录：

```powershell
npm run doctor
.\启动桥接.cmd
```

分项启动入口直接运行桥接，不要求安装可选表情包。`一键启动大肥鱼.cmd` 适用于全部可选模块都已配置好的电脑，首次安装不必使用。

打开 `http://127.0.0.1:3100`，令牌从自己的 `config.json` 中读取，不要贴到Issue。逐项验收：

1. 网关显示你的小号在线，账号与 `botQQ` 一致。
2. 控制台显示DSH连接就绪。
3. 主号给小号发送一句测试消息，确实收到回复。
4. 重启桥接，再发一句，确认会话能继续；不要仅用“端口可连接”代替收发验收。

默认只允许主人私聊、群聊关闭、模式为安全聊天。完整主人工具预设、人格插件、空间和自主功能需要读完相应源码和权限说明后按需安装，不能把所有 `setup-*.mjs` 一次执行。它们中包含修改profile和创建定时任务的入口。

## 6. 再添加可选能力

依次参考[依赖清单](DEPENDENCIES.md)：抖音SDK依赖 → 生图 → 语音 → 手机。微信单独看[微信集成](WECHAT.md)。每添加一项都验证真实输入/输出，保留故障日志，不用反复重启全部服务掩盖问题。
