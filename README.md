# wg-easy · 个人修改版

> 上游项目：[**wg-easy/wg-easy**](https://github.com/wg-easy/wg-easy)　·　上游文档：[wg-easy.github.io/wg-easy](https://wg-easy.github.io/wg-easy/latest)
>
> 本仓库是它的**修改版（fork）**，不是官方发布。

[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](LICENSE)

> [!IMPORTANT]
> **本仓库是 [wg-easy](https://github.com/wg-easy/wg-easy) 的修改版，不是官方发布。**
> 维护者：[jzjbyq](https://github.com/jzjbyq)　·　上游基线：`v15.5.0`（2026-10-24）　·　修改日期：2026-10-29
>
> 本仓库**只在 Web UI 上增加了两项功能**：客户端列表分页、客户端批量操作。
> 没有改动 WireGuard 本身，没有改数据库结构，没有改监听端口（`ListenPort`），也没有新增服务端 API。
>
> 与上游作者（Emile Nijssen / WeeJeWel、kaaax0815 及所有贡献者）**无任何关联**，未获其背书或授权。
> 授权方式沿用 **AGPL-3.0-only**，原始版权声明全部保留，完整许可证文本见 [LICENSE](LICENSE)。

---

## 一、这个仓库是什么

上游 wg-easy 是一个把 WireGuard 服务端与 Web 管理界面打包在一起的项目，用 Docker 一条命令就能跑起来。

我在长期使用中遇到两个不便，于是做了这个修改版：

1. **列表没有分页**。客户端一多，页面会被无限拉长，找某个客户端要一直往下滚。
2. **删除和启停只能逐条操作**。一次清理几十个过期客户端，要重复点几十遍确认。

本仓库只在这两点上做了补充。除这两项之外，其余代码与上游 `v15.5.0` 保持一致——WireGuard 配置生成、
数据库与迁移、鉴权与 2FA、防火墙规则、CLI、i18n 框架全部是上游原样。

上游的全部能力在本版本中**完整保留**：WireGuard + Web UI 一体化、客户端增删改与启停、二维码、
配置文件下载、连接状态与流量图表、多语言、自动明暗主题、一次性链接、客户端到期时间、2FA、
OIDC（Google / GitHub / Authelia / Authentik 等）、IPv6、CIDR、Prometheus 指标、per-client 防火墙过滤。

这些功能**怎么用，请直接看上游文档**，本仓库不重复搬运：

| 内容 | 地址 |
|---|---|
| 上游仓库 | <https://github.com/wg-easy/wg-easy> |
| 上游文档（推荐从这里开始） | <https://wg-easy.github.io/wg-easy/latest> |
| 快速开始 / 基础安装 | <https://wg-easy.github.io/wg-easy/latest/getting-started/> |
| 反向代理（Caddy / Traefik） | <https://wg-easy.github.io/wg-easy/latest/examples/tutorials/caddy/> |
| 从旧版本迁移 | <https://wg-easy.github.io/wg-easy/latest/advanced/migrate/> |

## 二、本版新增的功能

### 1. 客户端列表分页

- 列表底部增加分页条：上一页 / 下一页 / 页码直达 / 每页条数（**10 / 20 / 50 / 100**）/ 当前范围显示（`1-10 of 37`）。
- 每页条数记在浏览器 cookie（`pageSize`），刷新后保留；当前页码是组件内状态，刷新回到第 1 页。
- 分页在**前端切片**，`GET /api/client` 仍返回全量数据（上游架构如此），因此流量与连接状态的轮询不受分页影响。

### 2. 客户端批量操作

- 列表每行增加勾选框，支持多选、全选本页、半选态显示。
- 选中后顶部浮出操作条：**批量启用 / 批量禁用 / 批量删除**，均带确认弹窗与 `x/N` 进度显示，执行期间按钮置灰。
- 批量动作**串行**调用上游已有的单条接口（`DELETE /api/client/:id`、`POST /api/client/:id/enable|disable`）。
  之所以串行：每次客户端写操作都会触发一次 `wg syncconf` 与 iptables 重建，并发会互相踩踏。
  代价是删除 50 个客户端约需 15–30 秒。
- 批量操作入口**仅对管理员**（`role === 1`）显示；普通客户端账号的视图不受影响。

## 三、从源码构建镜像

### 3.1 环境要求

| 项目 | 要求 |
|---|---|
| Docker | 20.10 及以上（默认启用 BuildKit） |
| 磁盘 | 建议预留 6 GB（工具链层约 470 MB，各中间层累计） |
| 网络 | 能拉取 Docker Hub 的 `node:krypton-alpine` 基础镜像 |

### 3.2 选哪个 Dockerfile

仓库里有**两个** Dockerfile，任选其一：

| 文件 | 说明 | 适用场景 |
|---|---|---|
| `Dockerfile` | 上游原版，本仓库**未做任何改动** | 海外网络，或宿主机已有全局代理 |
| `Dockerfile.cn` | 国内网络版，本 fork 附带 | 国内网络直连官方源会超时 |

`Dockerfile.cn` 与官方版的差异只有两处，产物、`CMD`、`ENV`、`HEALTHCHECK` 完全一致：

1. **5 类外部资源换成国内镜像**：npm、Alpine apk、Go 模块代理、GitHub 源码、基础镜像。
2. **把官方那个约 400 秒的单个 `RUN` 拆成 4 层**（换源 / 装工具链 / clone 源码 / 下载依赖），
   网络抖动导致失败时只重跑出错的那一层，不用从零开始。

> [!NOTE]
> 官方 `Dockerfile` 默认走 `registry.npmjs.org` 与 `proxy.golang.org`，
> 国内直连 `proxy.golang.org` 必然 `i/o timeout`——这正是「apk 装完、clone 成功、最后 go build 失败」的典型原因。

### 3.3 构建（国内网络，推荐）

```bash
git clone https://github.com/jzjbyq/wg-easy-custom.git
cd wg-easy-custom

docker build -f Dockerfile.cn -t wg-easy:custom .
```

> [!WARNING]
> **构建上下文（context）必须是仓库根目录**，即命令末尾的那个 `.`。
> 不能 `cd src` 或 `cd` 到任何子目录再构建——Dockerfile 里要 `COPY src/package.json` 和 `COPY src ./`，路径基准变了就找不到文件。

GitHub 直连不通时，加一个前缀式代理：

```bash
docker build -f Dockerfile.cn -t wg-easy:custom \
  --build-arg GH_PROXY=https://ghfast.top/ \
  .
```

`GH_PROXY` 是**前缀**拼接：`https://ghfast.top/` + `https://github.com/amnezia-vpn/amneziawg-go` 组成完整地址。
可用代理服务波动较大，`ghfast.top` 不通就换 `gh-proxy.com`、`ghproxy.net`、`gh.llkk.cc`，末尾的斜杠不能少。

### 3.4 构建（海外网络或已配置全局代理）

```bash
docker build -t wg-easy:custom .
```

### 3.5 构建参数

`Dockerfile.cn` 的每一项都能单独退回官方源，用 `--build-arg` 覆盖：

| 参数 | 默认值 | 作用 |
|---|---|---|
| `NODE_IMAGE` | `docker.io/library/node:krypton-alpine@sha256:06d7adf3…` | 基础镜像，可换成私有仓库地址 |
| `NPM_REGISTRY` | `https://registry.npmmirror.com` | npm / pnpm 包源 |
| `APK_MIRROR` | `mirrors.aliyun.com` | Alpine apk 源，只替换 host，版本路径沿用基础镜像 |
| `GOPROXY_URL` | `https://goproxy.cn,https://mirrors.aliyun.com/goproxy/,direct` | Go 模块代理，逗号分隔表示多级回退 |
| `GH_PROXY` | 空（直连 github.com） | GitHub 前缀式代理 |
| `AWGTOOLS_BRANCH` | `v3.1.20260812` | amneziawg-tools 版本 |
| `AWGGO_BRANCH` | `v3.1.20260828` | amneziawg-go 版本 |

示例：npm 用官方源、apk 用清华镜像、Go 代理只写一个

```bash
docker build -f Dockerfile.cn -t wg-easy:custom \
  --build-arg NPM_REGISTRY=https://registry.npmjs.org \
  --build-arg APK_MIRROR=mirrors.tuna.tsinghua.edu.cn \
  --build-arg GOPROXY_URL=https://goproxy.cn,direct \
  .
```

### 3.6 耗时与分层

| 场景 | 参考耗时 |
|---|---|
| 首次完整构建 | 20–40 分钟（主要看网络） |
| 只改了 `src/` 前端代码后重建 | 3–6 分钟（npm 安装与工具链层命中缓存，只重跑 `pnpm build` 及之后） |
| 只改了 `Dockerfile.cn` 的运行时段 | 1–2 分钟 |

想看清每一层在干什么，构建时加 `--progress=plain`：

```bash
docker build -f Dockerfile.cn -t wg-easy:custom --progress=plain . 2>&1 | tee build.log
```

### 3.7 启动

构建产物的 tag 是 `wg-easy:custom`。仓库自带的 `docker-compose.yml` 指向官方镜像
（`ghcr.io/wg-easy/wg-easy:15`），**不要直接改它**——在仓库根目录新建一个 `docker-compose.override.yml`，
Compose 会自动叠加，原文件和 project 名都不动：

```yaml
services:
  wg-easy:
    image: wg-easy:custom
```

然后照常启动：

```bash
docker compose up -d
```

> [!WARNING]
> **卷名跟 project 名绑定，project 名变了等于配置全丢。**
> Compose 的 project name 默认取**第一个 compose 文件所在目录**的名字。如果你用 `-f 某个子目录/x.yml` 启动，
> project 会变成那个子目录名，卷也随之变成 `<子目录名>_etc_wireguard`，原来的 `wg-easy_etc_wireguard` 不会被挂载，
> 看起来就像所有客户端和配置都没了（实际是挂了一个新的空卷）。
> 用 `-p` 固定 project 名即可避免：
>
> ```bash
> docker compose -p wg-easy -f 某个子目录/x.yml up -d
> ```
>
> 查当前容器属于哪个 project：
>
> ```bash
> docker inspect wg-easy --format '{{ index .Config.Labels "com.docker.compose.project" }}'
> ```

不想用 Compose 的话，等价的手动启动（参数与 `docker-compose.yml` 一致，网络段需自行创建）：

```bash
docker run -d \
  --name wg-easy \
  --restart unless-stopped \
  -e PORT=51821 \
  -e HOST=0.0.0.0 \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  --cap-add NET_ADMIN \
  --cap-add SYS_MODULE \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  --sysctl net.ipv6.conf.all.disable_ipv6=0 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  --sysctl net.ipv6.conf.default.forwarding=1 \
  -v /lib/modules:/lib/modules:ro \
  -v etc_wireguard:/etc/wireguard \
  wg-easy:custom
```

启动后访问 `http://<设备IP>:51821`，首次进入需创建管理员账号。

### 3.8 验证构建结果

```bash
# 镜像是否新鲜
docker image inspect wg-easy:custom --format '{{.Created}}  {{.Size}}'

# 容器跑的是不是这个镜像
docker ps --filter name=wg-easy --format '{{.Names}}  {{.Image}}  {{.Status}}'

# 健康检查
docker inspect wg-easy --format '{{.State.Health.Status}}'
```

界面层面确认新功能已生效：客户端列表底部出现分页条，每行左侧出现勾选框，
每页条数下拉框的箭头不再压住数字。

### 3.9 常见构建错误

| 现象 | 原因 | 处理 |
|---|---|---|
| `go mod download` 报 `i/o timeout` / 卡在 `proxy.golang.org` | 用了官方 `Dockerfile`，没换 Go 代理 | 改用 `-f Dockerfile.cn`，或手动传 `--build-arg GOPROXY_URL=https://goproxy.cn,direct` |
| `git clone` 长时间无输出后失败 | `github.com` 不可达 | 加 `--build-arg GH_PROXY=https://ghfast.top/` |
| `apk add` 卡住或 404 | apk 镜像站抽风 | 换 `APK_MIRROR=mirrors.tuna.tsinghua.edu.cn` 或 `mirrors.ustc.edu.cn` |
| `pnpm install` 报 `Cannot find matching keyid` | 镜像站 packument 缺 `dist.signatures` | `Dockerfile.cn` 已设 `COREPACK_INTEGRITY_KEYS=0`；自建 Dockerfile 需补上 |
| `failed to resolve source metadata ... node:krypton-alpine` | 拉不到 Docker Hub 基础镜像 | 配 `daemon.json` 的 `registry-mirrors`，或用 `--build-arg NODE_IMAGE=` 指向可达的镜像仓库 |
| 构建成功但界面没变化 | 容器还在跑旧镜像 | `docker compose up -d --force-recreate`；浏览器强制刷新 |

## 四、改动文件清单

相对上游 `v15.5.0`：**新增 5 个文件、修改 7 个文件**。

**新增**

| 路径 | 作用 |
|---|---|
| `src/app/components/Clients/Pagination.vue` | 分页条 |
| `src/app/components/Clients/BulkBar.vue` | 多选操作条 |
| `src/app/components/Clients/BulkActionDialog.vue` | 批量操作确认弹窗 |
| `src/app/components/Base/Checkbox.vue` | 勾选框（支持半选态） |
| `Dockerfile.cn` | 国内网络构建版 Dockerfile（不参与运行时，不影响镜像内容） |

**修改**

| 路径 | 改了什么 |
|---|---|
| `src/app/stores/clients.ts` | 分页状态、选择状态、批量操作（+269/−1） |
| `src/app/pages/index.vue` | 挂载分页条与多选操作条 |
| `src/app/components/Clients/List.vue` | 只渲染当前页；每行加勾选框 |
| `src/i18n/locales/en.json` | 新增 17 条文案 |
| `src/i18n/locales/zh-CN.json` | 同上 |
| `src/i18n/locales/zh-TW.json` | 同上 |
| `src/i18n/locales/zh-HK.json` | 同上 |

其余 20 个语言包未改动，缺失文案按上游机制回退英文。

## 五、已知限制

1. 分页只是前端切片，客户端数量达到几千级别时首屏 JSON 会变大——这是上游「一次性返回全量列表」架构的固有限制。
2. 批量操作串行执行，客户端很多时耗时较长，期间按钮置灰，请勿中途关闭页面。
3. 本仓库的代码**只做过 TypeScript / SFC 编译校验与状态逻辑测试**，未经上游 CI（`pnpm lint`、端到端测试）验证，
   也未在真实 WireGuard 环境中跑过完整回归。生产使用前请在测试环境自行验证。

## 六、从上游同步

```bash
git remote add upstream https://github.com/wg-easy/wg-easy.git
git fetch upstream
git rebase upstream/master
```

冲突通常出现在上面那 7 个修改文件里。语言包冲突概率较高（上游频繁增删 key），
处理原则是保留上游全部新 key，把分页与批量相关的 17 个 key 重新补回去。

## 七、免责声明

1. **非官方**。本仓库是个人基于 [wg-easy](https://github.com/wg-easy/wg-easy) 的修改版，与上游作者
   （Emile Nijssen / WeeJeWel、kaaax0815 及所有贡献者）**无任何关联**，未获其背书、授权或认可，
   也不是上游官方发布。原始版权归上游作者所有，原始版权声明全部保留。
2. **修改声明**。依 AGPL-3.0 第 5 条要求，在此明确声明：**本仓库修改了原作品**，修改日期为
   **2026-10-29**，修改内容即上文第二节所述的两项 Web UI 功能及其配套调整。
3. **授权方式**。本修改版与原作品一致，采用 **AGPL-3.0-only** 授权，完整许可证文本见 [LICENSE](LICENSE)。
   任何人分发本软件或其衍生作品（含通过网络提供服务）时，均须遵守 AGPL-3.0 全部条款，
   包括向使用者提供对应的完整源代码。
4. **无担保**。本软件按「现状」（AS IS）提供，不附带任何明示或暗示的担保，包括但不限于适销性、
   特定用途适用性和非侵权担保。
5. **责任限制**。本修改版只增加了 UI 层面的功能，且**未经完整生产环境验证**。使用者需自行承担全部风险。
   对于因使用或无法使用本软件而导致的任何直接、间接、偶然、特殊或后果性损失——包括但不限于
   VPN 连接中断、配置写入错误、流量异常或超额计费、数据丢失、服务中断、被云服务商封禁或处罚、
   违反当地法规——**本人不承担任何责任**。
6. **使用建议**。生产部署前请务必：在测试环境完整验证；备份 `/etc/wireguard` 目录与 wg-easy 数据库文件。
7. **合规**。请自行确认并遵守所在国家/地区关于加密技术、网络工具与跨境数据传输的法律法规。
   因使用本软件产生的任何法律责任与合规风险，由使用者自行承担。
8. **商标**。「WireGuard」及 WireGuard 标识是 Jason A. Donenfeld 的注册商标。本项目与
   Jason A. Donenfeld、ZX2C4、Edge Security 均无关联。

---

## License

This project is licensed under the AGPL-3.0-only License - see the [LICENSE](LICENSE) file for details

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Jason A. Donenfeld, ZX2C4 or Edge Security

"WireGuard" and the "WireGuard" logo are registered trademarks of Jason A. Donenfeld

---

上游项目：[wg-easy/wg-easy](https://github.com/wg-easy/wg-easy) · 上游文档：[wg-easy.github.io/wg-easy](https://wg-easy.github.io/wg-easy/latest)
