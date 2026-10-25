# 张梓濠的小计划 PWA

一个可添加到 iPhone 主屏幕的本地优先 PWA。无需 Apple 开发者签名，数据保存在浏览器本机。

## 在线地址

已部署到 GitHub Pages：

https://zzhjjd100-dot.github.io/zhangzihao-plans-pwa/

GitHub 仓库：

https://github.com/zzhjjd100-dot/zhangzihao-plans-pwa

## 已实现

- 深灰背景和高重要性红色文字
- 主页按日期从新到旧展示
- 每天最多显示三条任务，长文本两行省略
- 语音输入和文字输入
- Web Speech API 可用时直接进行网页语音识别
- 不支持网页语音时，麦克风按钮会聚焦输入框，可使用 iPhone 键盘麦克风听写
- 「智能整理」与「原样加入」
- 中文日期、时间、重要性和多任务提取
- 整理结果逐项修改、删除和确认
- 日期详情页继续添加与管理
- 完成保留、完成删除、永久删除和恢复
- localStorage 本地持久化
- Service Worker 离线缓存
- iPhone 17 Pro Max 安全区域适配

## 本地打开

当前服务：

`http://127.0.0.1:4173/`

重新启动：

```bash
cd "/Users/zzh/Documents/Codex/2026-10-25/ban/outputs/ZhangZihaoPlans-PWA"
npm start
```

## 安装到 iPhone

1. 用 iPhone Safari 打开：
   `https://zzhjjd100-dot.github.io/zhangzihao-plans-pwa/`
2. 等待页面首次加载完成。
3. 点击 Safari 分享按钮。
4. 选择“添加到主屏幕”。
5. 从主屏幕打开后即可使用独立窗口。

首次加载完成后，Service Worker 会缓存应用外壳；后续可以离线打开。

GitHub Pages、Cloudflare Pages、Netlify 和普通 HTTPS 静态网站的部署方法见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 语音说明

Safari 支持 `SpeechRecognition` 或 `webkitSpeechRecognition` 时会直接使用网页语音识别。

不支持时会自动改用键盘听写入口，不会上传或保存原始录音。所有任务和提取结果只存入当前网站的 localStorage。

## 数据

- 数据键名：`zhangzihao-plans-v1`
- 清除 Safari 网站数据或卸载 PWA 会删除本地计划
- 当前版本不做云端同步

## 测试

完整两轮测试：

```bash
npm run test:rounds
```

全部测试：

```bash
npm test
```

## 测试结果

- 核心测试：16 项通过
- 覆盖语音转写后处理、信息提取、多任务、日期、重要性、排序、完成、删除、持久化和 PWA 资源完整性
- PWA 必需资源均可通过本地 HTTP 正常加载
