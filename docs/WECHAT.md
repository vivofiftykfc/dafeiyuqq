# 微信：进阶集成说明

## 交付范围

`wechat/integration` 提供与统一桥接、记忆、媒体、DSH、Tavern和原生传输对接的集成源码。**它还不是可在新电脑直接一键安装的完整微信机器人。**

公开包不包含个人 `local/runtime`、微信客户端、私有角色聊天、绑定文件、原生DLL或整套已安装Python环境。原生后端上游为 [pendj/helper](https://github.com/pendj/helper)，整理时参考提交记录见 `source-lock.json`。本次没有确认其全部源码的再分发许可，所以没有把该vendor整包放进仓库；请自行核对上游条款与兼容版本。

## 需要另行准备

| 项目 | 预期位置 | 说明 |
|---|---|---|
| 兼容微信客户端 | 自己的安装目录 | 本机集成固定为4.1.15.13，不保证其他版本 |
| 原生后端 | `wechat/vendor/helper-source` | 包含framework、native源码/构建结果及兼容指纹 |
| 原生Python环境 | `wechat/runtime/wechat-env` | 安装后端requirements、psutil、httpx、websockets等 |
| MaiBot与独立环境 | `wechat/runtime/MaiBot` | 相关服务端口18001/18011，需独立会话配置 |
| 嵌入服务环境 | `wechat/runtime/services-env` | 依赖见 `integration/embedding-requirements.lock` |
| 嵌入模型 | `wechat/runtime/models` | 配置使用bge-small-zh-v1.5，需核对本地快照目录 |
| SillyTavern | 外置独立实例 | 仅需要Tavern路径时安装；当前统一核心并非每次回复都依赖Tavern |
| 绑定与隔离配置 | `wechat/local`、`wechat/runtime/isolation.json` | 必须按自己的账号、进程创建时间及客户端哈希生成 |

集成里的 `privacy_policy.py`、`wechat_native_probe.py`、`wechat-scope.js` 等示例账号标记需要改为自己的明确白名单。不能只改显示昵称或PID；应同时核验账号、进程创建时间、可执行路径、客户端版本指纹与媒体目录。

## 启动与验收顺序

1. 先准备并验证底层原生后端，不连接真实聊天，完成只读账号核验。
2. 生成私聊/群聊隔离配置，验证两者不能互读历史；群聊默认关闭，明确配置后才启用。
3. 普通权限下启动 `integration/start-local.ps1 -NoBrowser`，确认主人工具后台身份正确。
4. 再通过管理员启动器启动原生桥接。不要从管理员上下文悄悄启动普通权限的主人工具执行器。
5. 主人向小号发一条测试消息，检查接收、生成、排队、native确认和实际微信显示。`queued` 不是投递完成，native确认也不是已读回执。
6. 正常停止并确认卸载，再验证重启后账号绑定没有漂移。

任何绑定不符都应停止微信接入，QQ等独立服务可以继续运行。当前尚无公开的新机器全量安装验收，因此请不要将本页面解释成兼容所有Windows微信的承诺。
