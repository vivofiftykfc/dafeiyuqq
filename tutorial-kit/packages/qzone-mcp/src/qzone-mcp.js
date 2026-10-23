// qzone-mcp · QQ 空间 MCP 服务器（stdio）
//
// 干什么：让 AI 自己发 QQ 空间说说、看好友动态、点赞、评论。
//
// 用法：
//   1) 机器上跑着 SnowLuma（QQ 网关），OneBot HTTP 在 127.0.0.1:3000
//   2) npx qzone-mcp
//   3) 在任意支持 MCP 的客户端里配上它
//
// 环境变量（都可选）：
//   SNOWLUMA_HTTP_URL       OneBot HTTP 地址（默认 http://127.0.0.1:3000）
//   SNOWLUMA_ACCESS_TOKEN   访问令牌（默认从 qq-bridge 的 config.json 里读）
//   QZONE_CONFIG            配置文件路径（默认自动探测 config.json）
//   QZONE_IMAGE_DIRS        允许发图的目录，多个用 ; 分隔（默认 图库 + 截图目录）
//
// 设计要点：
// - 不依赖 adb、不依赖手机，只要能连上 SnowLuma 就能用。
// - 只给「创作类」能力：发、看、赞、评。**删除和拉黑故意不提供** —— 发出去的话收不回来，这是刻意的限制。
// - 每类操作都带频率上限，防止一口气刷屏。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── 配置 ────────────────────────────────────────────────────────────────
const SNOWLUMA_HTTP = (process.env.SNOWLUMA_HTTP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

const CONFIG_CANDIDATES = [
  process.env.QZONE_CONFIG,
  process.env.QQ_BRIDGE_CONFIG,
  process.env.HER_BRIDGE_DIR && path.join(process.env.HER_BRIDGE_DIR, 'config.json'),
  path.join(process.cwd(), 'config.json'),
  path.join(process.cwd(), '..', 'config.json'),
  'E:\\qq-bridge\\config.json',
  path.join(os.homedir(), 'qq-bridge', 'config.json'),
].filter(Boolean);

// 允许发图的目录：只认这几个地方，别的路径一律拒绝
// 默认那三个里，只留真实存在的 —— 别人机器上没有 E 盘那两个，留着只会让发图全失败
const IMAGE_DIR_CANDIDATES = (process.env.QZONE_IMAGE_DIRS
  || ['E:\\ai\\_her_pics', 'E:\\ai\\_phone_shots', path.join(os.homedir(), 'Pictures')].join(';'))
  .split(';').map((s) => s.trim()).filter(Boolean);

function isDir(d) {
  try { return fs.statSync(d).isDirectory(); } catch { return false; }
}

const MISSING_IMAGE_DIRS = IMAGE_DIR_CANDIDATES.filter((d) => !isDir(d));
const IMAGE_DIRS = IMAGE_DIR_CANDIDATES.filter(isDir);

const MAX_IMAGES = 9;

// ── 令牌 ────────────────────────────────────────────────────────────────
let __token = null;
let __tokenAt = 0;

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function loadSnowlumaToken() {
  if (__token && Date.now() - __tokenAt < 60000) return __token;

  // ① config.json 的 snowluma.accessToken
  for (const f of CONFIG_CANDIDATES) {
    const c = readJson(f);
    const v = c?.snowluma?.accessToken;
    if (typeof v === 'string' && v.trim()) {
      __token = v.trim(); __tokenAt = Date.now(); return __token;
    }
  }

  // ② 环境变量
  if (process.env.SNOWLUMA_ACCESS_TOKEN) {
    __token = String(process.env.SNOWLUMA_ACCESS_TOKEN).trim();
    __tokenAt = Date.now(); return __token;
  }

  // ③ 兜底：SnowLuma 自己的 config/onebot_<uin>.json
  for (const d of ['E:\\SnowLuma\\config', path.join(os.homedir(), 'SnowLuma', 'config')]) {
    if (!fs.existsSync(d)) continue;
    for (const name of fs.readdirSync(d)) {
      if (!/^onebot_.*\.json$/.test(name)) continue;
      const c = readJson(path.join(d, name));
      const v = c?.networks?.httpServer?.accessToken ?? c?.accessToken ?? c?.networks?.accessToken;
      if (typeof v === 'string' && v.trim()) {
        __token = v.trim(); __tokenAt = Date.now(); return __token;
      }
    }
  }
  return null;
}

// ── OneBot 调用 ─────────────────────────────────────────────────────────
async function snowluma(action, payload) {
  const token = loadSnowlumaToken();
  if (!token) throw new Error('拿不到访问令牌。设环境变量 SNOWLUMA_ACCESS_TOKEN，或确认 config.json 里有 snowluma.accessToken');
  const res = await fetch(`${SNOWLUMA_HTTP}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch {}
  if (!res.ok || !data || data.status !== 'ok') {
    throw new Error(`${action} 失败：HTTP ${res.status} ${txt.slice(0, 260)}`);
  }
  return data.data;
}

// ── 图片 ────────────────────────────────────────────────────────────────
function resolveImage(input) {
  const s = String(input ?? '').trim();
  if (!s) return { error: '图片路径是空的' };
  if (/^https?:\/\//i.test(s)) return { file: s };        // 网络图直接交给 OneBot
  const abs = path.resolve(s);
  const ok = IMAGE_DIRS.some((d) => {
    const base = path.resolve(d);
    return abs === base || abs.startsWith(base + path.sep);
  });
  if (!ok) {
    return { error: `图片不在允许的目录里：${abs}\n允许的目录：${IMAGE_DIRS.join(' , ')}` };
  }
  if (!fs.existsSync(abs)) return { error: `图片不存在：${abs}` };
  return { file: abs };
}

// ── 文本处理 ────────────────────────────────────────────────────────────
function htmlToText(s) {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 限流 ────────────────────────────────────────────────────────────────
function makeLimiter(checks, label) {
  return function check() {
    const now = Date.now();
    this.hits = (this.hits || []).filter((t) => now - t < 24 * 3600 * 1000);
    for (const [ms, max, word] of checks) {
      if (max && this.hits.filter((t) => now - t < ms).length >= max) {
        return `【限流】${label}${word}最多 ${max} 次，稍后再来`;
      }
    }
    this.hits.push(now);
    return null;
  };
}

const limitGeneric = makeLimiter([[60e3, 3, '每分钟']], '空间操作').bind({});
const limitComment = makeLimiter([[10 * 60e3, 2, '每 10 分钟'], [86400e3, 10, '每天']], '评论').bind({});
const limitVisit = makeLimiter([[3 * 60e3, 5, '每 3 分钟（翻太快会被 QQ 限流）'], [86400e3, 40, '每天']], '看别人空间').bind({});

// ── MCP ─────────────────────────────────────────────────────────────────
const text = (s) => ({ content: [{ type: 'text', text: String(s) }] });
const fail = (s) => ({ content: [{ type: 'text', text: String(s) }], isError: true });

const server = new McpServer({ name: 'qzone', version: '0.1.0' });

server.tool(
  'qzone_post',
  '发一条 QQ 空间说说（你自己的空间）。可以纯文字，也可以带图（图只能来自图库/截图目录，或者 http(s) 链接；最多 9 张）。带频率上限，别连着发。',
  {
    content: z.string().describe('说说正文'),
    images: z.array(z.string()).max(MAX_IMAGES).optional().describe('配图：图库里的文件名或绝对路径，或 http(s) 图片链接；最多 9 张'),
  },
  async ({ content, images }) => {
    try {
      const blocked = limitGeneric();
      if (blocked) return fail(blocked);
      const files = [];
      for (const img of images ?? []) {
        const r = resolveImage(img);
        if (r.error) return fail(r.error);
        files.push(r.file);
      }
      const data = await snowluma('send_qzone_msg', files.length ? { content, images: files } : { content });
      return text(`已发说说 ✓\n${JSON.stringify(data ?? {}, null, 2).slice(0, 400)}`);
    } catch (e) {
      return fail(`发说说失败：${e?.message ?? e}`);
    }
  }
);

server.tool(
  'qzone_my_posts',
  '看你自己的 QQ 空间说说列表（确认发出去没有、或者回顾自己发过什么）。想看别人的用 qzone_feeds 或 qzone_user_posts。',
  { num: z.number().int().min(1).max(20).default(5).describe('看几条，默认 5') },
  async ({ num }) => {
    try {
      const data = await snowluma('get_qzone_msg_list', { num });
      const list = Array.isArray(data) ? data : (data?.msglist ?? data?.list ?? []);
      if (!Array.isArray(list) || !list.length) {
        return text(`没取到说说列表：${JSON.stringify(data ?? {}).slice(0, 300)}`);
      }
      const lines = list.slice(0, num).map((x, i) => {
        const t = htmlToText(x.content ?? x.summary ?? x.text ?? '').slice(0, 70);
        return `${i + 1}. [tid=${x.tid ?? x.id ?? '?'}] ${t || '(无文字)'}  赞${x.like_count ?? x.likenum ?? 0} 评${x.comment_count ?? x.cmtenum ?? 0}`;
      });
      return text(`你自己的说说（${list.length} 条）：\n${lines.join('\n')}`);
    } catch (e) {
      return fail(`看说说失败：${e?.message ?? e}`);
    }
  }
);

server.tool(
  'qzone_like',
  '给一条 QQ 空间说说点赞。tid 从 qzone_feeds 或 qzone_my_posts 里拿，不需要链接。',
  {
    tid: z.string().describe('说说的 tid'),
    targetUin: z.union([z.string(), z.number()]).optional().describe('说说主人的 QQ 号（给自己的说说可不填）'),
    abstime: z.number().optional().describe('时间戳（部分接口需要）'),
  },
  async ({ tid, targetUin, abstime }) => {
    try {
      const blocked = limitGeneric();
      if (blocked) return fail(blocked);
      const payload = { tid };
      if (targetUin) payload.target_uin = Number(targetUin);
      if (abstime) payload.abstime = abstime;
      const data = await snowluma('like_qzone', payload);
      return text(`点赞成功 ✓ ${JSON.stringify(data ?? {}).slice(0, 200)}`);
    } catch (e) {
      return fail(`点赞失败：${e?.message ?? e}`);
    }
  }
);

server.tool(
  'qzone_comment',
  '评论一条 QQ 空间说说。**发出撤不回**（QQ 空间没有删评论接口），所以限额很紧：每 10 分钟 2 条、每天 10 条。想表达喜欢优先点赞，别动不动就评论。',
  {
    tid: z.string().describe('说说的 tid'),
    content: z.string().describe('评论内容'),
    targetUin: z.union([z.string(), z.number()]).optional().describe('说说主人的 QQ 号'),
  },
  async ({ tid, content, targetUin }) => {
    try {
      const blocked = limitComment();
      if (blocked) return fail(blocked);
      const payload = { tid, content };
      if (targetUin) payload.target_uin = Number(targetUin);
      const data = await snowluma('comment_qzone', payload);
      return text(`评论成功 ✓ ${JSON.stringify(data ?? {}).slice(0, 200)}`);
    } catch (e) {
      return fail(`评论失败：${e?.message ?? e}`);
    }
  }
);

server.tool(
  'qzone_user_posts',
  '看【指定的人】的 QQ 空间说说（群友也行）：传他的 QQ 号就行，不用链接。拿到 tid 后可以点赞/评论。对方没开空间或设了权限时会失败，这是正常的。',
  {
    targetUin: z.union([z.string(), z.number()]).describe('要看的人的 QQ 号'),
    num: z.number().int().min(1).max(20).default(5).describe('看几条，默认 5'),
  },
  async ({ targetUin, num }) => {
    try {
      const blocked = limitVisit();
      if (blocked) return fail(blocked);
      const data = await snowluma('get_qzone_msg_list', { target_uin: Number(targetUin), num });
      const list = Array.isArray(data) ? data : (data?.msglist ?? data?.list ?? []);
      if (!Array.isArray(list) || !list.length) {
        return text(`没取到说说（对方可能没开空间 / 设了权限 / 最近没发）：${JSON.stringify(data ?? {}).slice(0, 200)}`);
      }
      const lines = list.slice(0, num).map((x, i) => {
        const t = htmlToText(x.content ?? x.summary ?? x.html ?? '').slice(0, 70);
        return `${i + 1}. [tid=${x.tid ?? x.key ?? '?'}] ${t || '(无文字，可能是图片说说)'}  赞${x.like_count ?? x.likenum ?? 0} 评${x.comment_count ?? x.cmtenum ?? 0}`;
      });
      return text(`QQ ${targetUin} 的说说（${list.length} 条）：\n${lines.join('\n')}`);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (msg.includes('-10031') || msg.includes('保密') || msg.includes('没有权限')) {
        return fail('对方的空间设了权限（QQ 提示「主人设置了保密」），看不了 —— 这是正常的，换个目标，别反复试同一个。');
      }
      if (msg.includes('rate-limited') || msg.includes('限流')) {
        return fail('查得太快被 QQ 限流了，歇几分钟再看（别一口气翻一群人）。');
      }
      return fail(`看对方空间失败：${msg.slice(0, 160)}`);
    }
  }
);

server.tool(
  'qzone_feeds',
  '看 QQ 空间【好友动态】（包括主人发的说说）。想给某条说说点赞/评论时先调这个，返回里带 tid。不需要用户提供链接。',
  {
    count: z.number().int().min(1).max(20).default(8).describe('看几条，默认 8'),
    page: z.number().int().min(1).max(5).default(1).describe('第几页，默认 1'),
  },
  async ({ count, page }) => {
    try {
      const data = await snowluma('get_qzone_feeds', { page_num: page, count });
      const list = Array.isArray(data) ? data : (data?.msglist ?? data?.list ?? data?.feeds ?? []);
      if (!Array.isArray(list) || !list.length) {
        return text(`没取到好友动态：${JSON.stringify(data ?? {}).slice(0, 300)}`);
      }
      const lines = list.slice(0, count).map((x, i) => {
        const who = x.nickname || x.name || x.uin || x.user_id || '?';
        const t = htmlToText(x.html ?? x.content ?? x.summary ?? x.text ?? '').slice(0, 60);
        const pics = (x.pic || x.images || []).length;
        return `${i + 1}. [tid=${x.key ?? x.tid ?? x.id ?? '?'}] [uin=${x.uin ?? x.user_id ?? '?'}] ${who}: ${t}${pics ? ` (${pics}图)` : ''}  赞${x.like_count ?? x.likenum ?? 0} 评${x.comment_count ?? x.cmtenum ?? 0}`;
      });
      return text(`好友动态（第 ${page} 页，${list.length} 条）：\n${lines.join('\n')}`);
    } catch (e) {
      return fail(`看好友动态失败：${e?.message ?? e}`);
    }
  }
);

server.tool(
  'qzone_recent_like',
  '给好友动态里最新的一条直接点赞。只要知道昵称就行（比如 who="主人"），不用链接、不用 tid。可选 comment 顺便评论一句。',
  {
    who: z.string().optional().describe('只找这个人的动态（昵称或 QQ 号的一部分）'),
    comment: z.string().optional().describe('顺便评论一句（可选）'),
  },
  async ({ who, comment }) => {
    try {
      const blocked = limitGeneric();
      if (blocked) return fail(blocked);
      const data = await snowluma('get_qzone_feeds', { page_num: 1, count: 20 });
      const list = Array.isArray(data) ? data : (data?.msglist ?? data?.list ?? data?.feeds ?? []);
      if (!Array.isArray(list) || !list.length) return fail('没取到好友动态，点赞失败');

      let hit = list[0];
      if (who) {
        const found = list.find((x) => JSON.stringify(x).includes(who));
        if (!found) return fail(`最近 20 条动态里没找到「${who}」发的`);
        hit = found;
      }
      const tid = hit.key ?? hit.tid ?? hit.id;
      const uin = hit.uin ?? hit.user_id;
      const name = hit.nickname || hit.name || uin;

      const payload = { tid };
      if (uin) payload.target_uin = Number(uin);
      const at = Number(hit.abstime ?? hit.time ?? 0);
      if (at) payload.abstime = at;
      await snowluma('like_qzone', payload);

      let extra = '';
      if (comment) {
        const cblocked = limitComment();
        if (cblocked) {
          extra = `（今天评论次数用完了，只点了赞：${cblocked}）`;
        } else {
          const cp = { tid, content: comment };
          if (uin) cp.target_uin = Number(uin);
          await snowluma('comment_qzone', cp);
          extra = `，并评论了「${comment}」`;
        }
      }
      const t = htmlToText(hit.html ?? hit.content ?? hit.summary ?? '').slice(0, 50);
      return text(`已给 ${name} 的动态点赞${extra} ✓\n那条是：${t}`);
    } catch (e) {
      return fail(`点赞失败：${e?.message ?? e}`);
    }
  }
);

// ── 启动 ────────────────────────────────────────────────────────────────
if (process.argv.includes('--selftest')) {
  const token = loadSnowlumaToken();
  console.log('OneBot 地址:', SNOWLUMA_HTTP);
  console.log('令牌:', token ? `已拿到（${token.length} 字符）` : '❌ 没找到（设 SNOWLUMA_ACCESS_TOKEN，或确认 config.json 里有 snowluma.accessToken）');
  console.log('允许发图的目录:', IMAGE_DIRS.join(' , ') || '（空 —— 发图会被拒绝，用 QZONE_IMAGE_DIRS 配一个）');
  if (MISSING_IMAGE_DIRS.length) console.log('  跳过（不存在）:', MISSING_IMAGE_DIRS.join(' , '));
  if (token) {
    try {
      const d = await snowluma('get_qzone_msg_list', { num: 1 });
      const list = d?.msglist ?? d?.data?.msglist ?? d?.msgs ?? [];
      // 只报条数：说说内容是她自己的，不该顺手刷到终端/截图里
      console.log(`连通性: ✅ 能取到自己的说说（${Array.isArray(list) ? list.length : 0} 条，内容不打印）`);
    } catch (e) {
      console.log('连通性: ❌', e?.message ?? e);
    }
  }
} else {
  await server.connect(new StdioServerTransport());
}
