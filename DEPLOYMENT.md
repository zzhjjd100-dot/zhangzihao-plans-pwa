# PWA 部署方法

这是一个纯静态 PWA，不需要后端或数据库。

## 方法一：GitHub Pages

本项目已经部署：

https://zzhjjd100-dot.github.io/zhangzihao-plans-pwa/

仓库：

https://github.com/zzhjjd100-dot/zhangzihao-plans-pwa

当前设置：

- Source：Deploy from a branch
- Branch：`main`
- Folder：`/ (root)`
- HTTPS：开启
- Jekyll：通过 `.nojekyll` 关闭

以后更新：

```bash
cd "/Users/zzh/Documents/Codex/2026-10-25/ban/outputs/ZhangZihaoPlans-PWA"
git add .
git commit -m "Update PWA"
git push
```

GitHub Pages 会自动重新构建。

## 方法二：Cloudflare Pages

1. 登录 Cloudflare Dashboard。
2. 进入 Workers & Pages。
3. 选择 Create application → Pages → Connect to Git。
4. 选择 GitHub 仓库 `zhangzihao-plans-pwa`。
5. Framework preset 选择 `None`。
6. Build command 留空。
7. Build output directory 填 `/` 或 `.`。
8. 点击 Save and Deploy。

每次推送到 `main` 时会自动重新部署。

## 方法三：Netlify

1. 登录 Netlify。
2. 选择 Add new site → Import an existing project。
3. 连接 GitHub 并选择 `zhangzihao-plans-pwa`。
4. Build command 留空。
5. Publish directory 填 `.`。
6. 点击 Deploy。

## 方法四：任意 HTTPS 静态托管

上传本目录内所有静态文件，保持目录结构不变：

- `index.html`
- `styles.css`
- `app.js`
- `extractor.js`
- `store.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/`

服务器需要：

- 使用 HTTPS
- 允许访问 `sw.js`
- 为 `.webmanifest` 返回 `application/manifest+json`
- 不要改写静态资源路径

## iPhone 安装

1. 用 Safari 打开部署后的 HTTPS 地址。
2. 等待页面首次加载完成。
3. 点击分享按钮。
4. 选择“添加到主屏幕”。
5. 以后从主屏幕启动。

`127.0.0.1` 只代表当前电脑，不能直接在 iPhone 上打开。

## 更新缓存

修改网页文件后，需要同时更新 `sw.js` 中的缓存版本：

```js
const CACHE_NAME = "zhangzihao-plans-v1.0.1";
```

然后重新部署，否则已安装的 PWA 可能继续使用旧缓存。
