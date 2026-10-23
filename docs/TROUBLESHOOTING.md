# 常见问题

| 现象 | 先查什么 |
|---|---|
| `node:sqlite` 不存在 | Node版本；用24+，不要沿用Node18/20教程 |
| 模块找不到 | 在对应子目录执行 `npm ci`；不要复制别人的node_modules目录链接 |
| 127.0.0.1打不开 | 它是自己电脑的服务；先检查服务是否启动和端口是否冲突 |
| QQ能接收但发送unauthorized | `accessToken` 是否误填了WebSocket令牌，应填HTTP令牌 |
| DSH能打开但桥接没回复 | profile、18031端口、provider/model、账号登录及桥接日志 |
| 角色/日记文件找不到 | 是否运行configure，`state/owner` 是否存在；角色不是从教程作者私有文件下载 |
| 表情导入失败 | 表情包是可选资源；无包时直接运行 `node qq-bridge/src/bridge.js` |
| 图片一直pending | 查看ComfyUI队列/错误；不要重复提交相同任务 |
| TTS显存不足 | 等生图结束或释放空闲缓存；检查CUDA PyTorch和模型完整性 |
| 手机offline/unauthorized | USB线、设备端授权、ADB版本；锁屏需本人解锁 |
| 微信绑定失败 | 客户端版本、账号、PID创建时间和指纹；不能只改PID绕过校验 |
| 移动目录后部分命令失效 | 检查venv启动器和junction目标，参考迁移说明 |

日志优先看主目录 `logs`、桥接 `state/bridge.log`、微信 `runtime` 和语音 `jobs`。发布Issue前移除令牌、Cookie、账号、联系人、聊天正文与私人文件路径。不要附整份config或数据库。
