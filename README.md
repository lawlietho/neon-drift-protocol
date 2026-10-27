# Neon Drift Protocol | 夜行协议

一个原创赛博朋克风格的浏览器 3D FPS 原型。进入霓虹街区后，使用方块掩体与移动策略清除三架巡逻无人机；射击可摧毁方块，并提供霓虹命中粒子、合成枪声、受击闪屏与装甲反馈。支持震动的设备会提供可选触觉反馈。

## 在线游玩

发布地址：[https://lawlietho.github.io/neon-drift-protocol/](https://lawlietho.github.io/neon-drift-protocol/)

## 启动

在 Windows PowerShell 中运行：

```powershell
cd C:\Users\siumourmi\Desktop\test1
py -m http.server 8000
```

在浏览器打开 http://localhost:8000。退出服务器可按 Ctrl+C。在线游玩和本地运行都不需要额外下载游戏引擎。

## 操作

电脑：W / A / S / D 移动，鼠标瞄准，按住鼠标左键连射，Shift 冲刺，R 换弹，Esc 暂停或继续。电脑默认隐藏触屏按钮，射击由鼠标控制，不会被屏幕控件拦截。

手机和平板：点“开始任务”后直接进入，无需锁定鼠标。左侧虚拟摇杆（W/A/S/D）移动，拖动空白区域（鼠标瞄准）转动视角，按住“开火”（鼠标左键）射击；“冲刺”（Shift）、“换弹”（R）、“暂停”（Esc）按钮位于右下方。横竖屏均可操作。

右上角“操作”或 F1 可打开/关闭操作侧栏；侧栏里的“屏幕控制”或 T 可显示/隐藏屏幕按钮。电脑的屏幕按钮只作提示，不拦截鼠标射击。

任务目标是清除全部无人机；无人机接近时会造成装甲损伤。方块可击碎，也可作为掩体。使用原创几何、程序生成音效与场景设计，不包含其他游戏的专有资产或商标。

`vendor/three.module.js` 随项目一同分发；其 MIT 许可证见 `vendor/THREE-LICENSE.txt`。
