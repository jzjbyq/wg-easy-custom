# WireGuard Easy

> 下列徽章来自**上游官方仓库**（`wg-easy/wg-easy`），反映的是上游项目状态，不是本 fork 的构建/发布状态。

[![Build & Publish latest Image](https://github.com/wg-easy/wg-easy/actions/workflows/deploy.yml/badge.svg)](https://github.com/wg-easy/wg-easy/actions/workflows/deploy.yml)
[![Lint](https://github.com/wg-easy/wg-easy/actions/workflows/lint.yml/badge.svg?branch=master)](https://github.com/wg-easy/wg-easy/actions/workflows/lint.yml)
[![GitHub Stars](https://img.shields.io/github/stars/wg-easy/wg-easy)](https://github.com/wg-easy/wg-easy/stargazers)
[![License](https://img.shields.io/github/license/wg-easy/wg-easy)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/wg-easy/wg-easy)](https://github.com/wg-easy/wg-easy/releases/latest)
[![Image Pulls](https://img.shields.io/badge/image_pulls-28M+-blue)](https://github.com/wg-easy/wg-easy/pkgs/container/wg-easy)

> [!IMPORTANT]
> **这是 [wg-easy](https://github.com/wg-easy/wg-easy) 的修改版（fork），不是官方发布。**
> 维护者：[jzjbyq](https://github.com/jzjbyq) · 上游基线：`v15.4.0`（commit `1c8188d4`，2026-10-06）· 修改日期：2026-10-17
> 本仓库**只在 Web UI 上增加了两项功能**：客户端列表分页、客户端批量操作。
> 没有改动 WireGuard 本身，没有改数据库结构，也没有改监听端口（`ListenPort`）。
> 与上游作者无任何关联，未获其背书；详见下方《[本仓库改动说明](#本仓库改动说明changes-in-this-fork)》与《[免责声明](#免责声明--disclaimer)》。
> 本项目沿用 AGPL-3.0-only 授权，原始版权声明全部保留，完整许可证文本见 [LICENSE](LICENSE)。

This repository is a modified fork of [wg-easy](https://github.com/wg-easy/wg-easy). It only adds two Web UI
features (client list pagination and batch operations). It is not an official release and is not affiliated with
or endorsed by the upstream project. Licensed under AGPL-3.0-only, all original copyright notices retained — see
[LICENSE](LICENSE) and the [fork changes](#本仓库改动说明changes-in-this-fork).

You have found the easiest way to install & manage WireGuard on any Linux host!

<p align="center">
  <img src="./assets/screenshot.png" width="802" alt="wg-easy Screenshot" />
</p>

## Features

- All-in-one: WireGuard + Web UI.
- Easy installation, simple to use.
- List, create, edit, delete, enable & disable clients.
- Show a client's QR code.
- Download a client's configuration file.
- Statistics for which clients are connected.
- Tx/Rx charts for each connected client.
- Gravatar support.
- Automatic Light / Dark Mode
- Multilanguage Support
- One Time Links
- Client Expiration
- Prometheus metrics support
- IPv6 support
- CIDR support
- 2FA support
- Per-client firewall filtering (requires iptables)
- OIDC support (Google, GitHub, Authelia, Authentik, etc.)
- **(fork only)** Client list pagination (10 / 20 / 50 / 100 per page)
- **(fork only)** Batch operations on clients: multi-select, select-all-on-page, batch enable / disable / delete

> [!NOTE]
> To better manage documentation for this project, it has its own site here: [https://wg-easy.github.io/wg-easy/latest](https://wg-easy.github.io/wg-easy/latest)

- [Getting Started](https://wg-easy.github.io/wg-easy/latest/getting-started/)
- [Basic Installation](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/basic-installation/)
- [Caddy](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/caddy/)
- [Traefik](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/traefik/)
- [Podman](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/podman-nft/)
- [AdGuard Home](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/adguard/)

> [!NOTE]
> If you want to migrate from the old version to the new version, you can find the migration guide here: [Migration Guide](https://wg-easy.github.io/wg-easy/latest/advanced/migrate/)

## 本仓库改动说明（Changes in this fork）

**基线**：上游 [`wg-easy/wg-easy`](https://github.com/wg-easy/wg-easy) `v15.4.0`（commit `1c8188d4`，2026-10-06）
**修改日期**：2026-10-17
**性质**：仅新增 Web UI 功能。**未改动 WireGuard 本身、未改数据库结构、未改监听端口。**

### 1. 客户端列表分页

- 原先客户端一多，页面就无限拉长；现在列表底部有分页条，每页可选 **10 / 20 / 50 / 100** 条。
- 每页条数记在浏览器 cookie（`pageSize`），刷新后保留；页码是组件内状态，刷新回到第 1 页。
- 分页只在**前端切片**，`GET /api/client` 仍返回全量数据（上游架构如此），所以流量数字轮询不会被分页打断。
- 涉及文件：`src/app/components/Clients/Pagination.vue`（新增）、`src/app/stores/clients.ts`、`src/app/components/Clients/List.vue`、`src/app/pages/index.vue`。

### 2. 客户端批量操作

- 列表每行新增勾选框，支持多选、全选本页、半选态显示。
- 选中后顶部出现操作条：**批量启用 / 批量禁用 / 批量删除**，均带确认弹窗与 `x/N` 进度显示，执行期间按钮置灰。
- 批量动作是**串行**调用上游已有的单条接口（`DELETE /api/client/:id`、`POST /api/client/:id/enable|disable`）。
  之所以串行：每个客户端操作都会触发一次 `wg syncconf` 与 iptables 重建，并发会互相踩踏。代价是删除 50 个约需 15–30 秒。
- 批量按钮**仅对管理员**（`role === 1`）显示；普通客户端账号不受影响。
- 涉及文件：`src/app/components/Base/Checkbox.vue`、`src/app/components/Clients/BulkBar.vue`、`src/app/components/Clients/BulkActionDialog.vue`（新增）、`src/app/stores/clients.ts`、`src/app/components/Clients/List.vue`。

### 3. 其他配套调整

- 4 个语言包（`en` / `zh-CN` / `zh-TW` / `zh-HK`）补齐了分页与批量操作的文案，共新增 17 条 key；其余语言未改，缺失文案回退英文。

### 改动文件清单（共 11 个）

**新增 4 个**

| 路径（相对 `src/`） | 作用 |
|---|---|
| `app/components/Clients/Pagination.vue` | 分页条 |
| `app/components/Clients/BulkBar.vue` | 多选操作条 |
| `app/components/Clients/BulkActionDialog.vue` | 批量操作确认弹窗 |
| `app/components/Base/Checkbox.vue` | 勾选框（支持半选态） |

**修改 7 个**

| 路径（相对 `src/`） | 改了什么 |
|---|---|
| `app/stores/clients.ts` | 分页状态、选择状态、批量操作 |
| `app/pages/index.vue` | 挂载分页条与多选操作条 |
| `app/components/Clients/List.vue` | 只渲染当前页；每行加勾选框 |
| `i18n/locales/{en,zh-CN,zh-TW,zh-HK}.json` | 各新增 17 条文案 |

### 已知限制

1. 分页只是前端切片，客户端数量到几千级别时首屏 JSON 会变大——这是上游架构的固有限制。
2. 批量操作串行执行，客户端很多时耗时较长，期间按钮置灰。
3. `src/` 下的代码**未经完整 CI 验证**（未跑 `pnpm lint` / 端到端测试），仅做过 TypeScript/SFC 编译，生产使用前请自行验证。

### 从上游同步

```bash
git remote add upstream https://github.com/wg-easy/wg-easy.git
git fetch upstream
git rebase upstream/master     # 可能需要在上面 7 个修改文件里解冲突
```

---

## Installation

This is a quick start guide to get you up and running with WireGuard Easy.

For a more detailed installation guide, please refer to the [Getting Started](https://wg-easy.github.io/wg-easy/latest/getting-started/) page.

### 1. Install Docker

If you haven't installed Docker yet, install it by running as root:

```shell
curl -sSL https://get.docker.com | sh
exit
```

And log in again.

### 2. Run WireGuard Easy

The easiest way to run WireGuard Easy is with Docker Compose.

Just follow [these steps](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/basic-installation/) in the detailed documentation.

You can also install WireGuard Easy with the [docker run command](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/docker-run/) or via [podman](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/podman-nft/).

Now [setup a reverse proxy](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/basic-installation/#setup-reverse-proxy) to be able to access the Web UI securely from the internet. This step is optional, just make sure to follow the guide [here](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/reverse-proxyless/) if you decide not to do it.

## Donate

Are you enjoying this project? Consider donating.

Founder: [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

Maintainer: [Buy kaaax0815 a coffee!](https://github.com/sponsors/kaaax0815) ☕

## Development

### Prerequisites

- Docker
- Node LTS & corepack enabled
- Visual Studio Code

### Dev Server

This starts the development server with docker

```shell
pnpm dev
```

### Update Auto Imports

If you add something that should be auto-importable and VSCode complains, run:

```shell
cd src
pnpm install
cd ..
```

### Test Cli

This starts the cli with docker

```shell
pnpm cli:dev
```

## 免责声明 / Disclaimer

### 中文

1. **非官方**。本仓库是个人基于 [wg-easy](https://github.com/wg-easy/wg-easy) 的修改版，与上游作者（Emile Nijssen / WeeJeWel、kaaax0815 及所有贡献者）**无任何关联**，未获其背书、授权或认可，也不是上游官方发布。原始版权归上游作者所有，原始版权声明全部保留。
2. **修改声明**。依 AGPL-3.0 第 5 条要求，在此明确声明：**本仓库修改了原作品**，修改日期为 **2026-10-17**，修改内容即上文《本仓库改动说明》所列的两项功能及其配套调整。
3. **授权方式**。本修改版与原作品一致，采用 **AGPL-3.0-only** 授权，完整许可证文本见 [LICENSE](LICENSE)。任何人分发本软件或其衍生作品（含通过网络提供服务）时，均须遵守 AGPL-3.0 的全部条款，包括向用户提供对应的完整源代码。
4. **无担保**。本软件按「现状」（AS IS）提供，不附带任何明示或暗示的担保，包括但不限于适销性、特定用途适用性和非侵权担保。
5. **责任限制**。本修改版只增加了 UI 层面的两项功能，但这些功能**未经完整生产环境验证**。使用者需自行承担全部风险。对于因使用或无法使用本软件而导致的任何直接、间接、偶然、特殊或后果性损失——包括但不限于：VPN 连接中断、配置写入错误、流量异常或超额计费、数据丢失、服务中断、被云服务商封禁或处罚、违反当地法规——**本人不承担任何责任**。
6. **使用建议**。生产环境部署前请务必：在测试环境完整验证；备份 `/etc/wireguard` 与 wg-easy 数据库。
7. **合规**。请自行确认并遵守所在国家/地区关于加密技术、网络工具与跨境数据传输的法律法规。因使用本软件产生的任何法律责任与合规风险，由使用者自行承担。
8. **商标**。「WireGuard」及 WireGuard 标识是 Jason A. Donenfeld 的注册商标。本项目与 Jason A. Donenfeld、ZX2C4、Edge Security 均无关联。

### English

This is an **unofficial, modified fork** of [wg-easy](https://github.com/wg-easy/wg-easy), maintained by
[jzjbyq](https://github.com/jzjbyq). It is not affiliated with, authorized, endorsed by, or in any way officially
connected with the upstream authors. As required by AGPL-3.0 §5, notice is given that **this repository modifies the
original work** on **2026-10-17**; the modifications are limited to the two UI features described above.

The fork is licensed under **AGPL-3.0-only**; the full license text is in [LICENSE](LICENSE). Redistributing this
software or any derivative (including making it available over a network) requires compliance with all AGPL-3.0 terms,
including offering the complete corresponding source code to users.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. THE MAINTAINER OF THIS FORK
ACCEPTS NO LIABILITY FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES ARISING FROM THE USE OF,
OR INABILITY TO USE, THIS SOFTWARE — INCLUDING BUT NOT LIMITED TO VPN DOWNTIME, MISWRITTEN CONFIGURATION, UNEXPECTED
TRAFFIC OR BILLING, DATA LOSS, SERVICE SUSPENSION, OR REGULATORY VIOLATIONS. Verify in a test environment and back up
`/etc/wireguard` and the database before production use. You are responsible for complying with the laws of your
jurisdiction.

"WireGuard" and the "WireGuard" logo are registered trademarks of Jason A. Donenfeld.

## License

This project is licensed under the AGPL-3.0-only License - see the [LICENSE](LICENSE) file for details

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Jason A. Donenfeld, ZX2C4 or Edge Security

"WireGuard" and the "WireGuard" logo are registered trademarks of Jason A. Donenfeld
