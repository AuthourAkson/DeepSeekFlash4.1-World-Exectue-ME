# 原始素材与归属

三份素材由委托方提供，位于 `original/`，**未作任何修改**。
`index.html` 与 `src/60_app.js` 通过相对路径直接引用它们。

| 文件 | 大小 (bytes) | SHA-256 | 提供时间 |
| --- | ---: | --- | --- |
| `original/Mili - world.execute (me) ;.mp3` | 8,480,690 | `FF9EC37E2C4066EC26FA47B9E5DC3EF23FDD1A4D42B9D5D36EBC36ACBE55CFED` | 2026-08-21 |
| `original/world.execute (me) ;.mid` | 5,177 | `00137AA08E0FB8F64204CDFD7829125B1F6D57CFEB3D305D25606AD8394CFBBB` | 2026-09-10 |
| `original/world.execute(me)-timeline.lrc` | 3,856 | `42D1F62EC08FBA903614706BAE9C325AEC11A683D24AA9B77DA39F082B985D83` | 2026-08-22 |

验证完整性的方法：

```powershell
Get-FileHash -LiteralPath "original\Mili - world.execute (me) ;.mp3" -Algorithm SHA256
```

三份文件的修改时间（2026-08-21 / 08-22 / 09-10）都早于本次创作（2026-09-11），
即从收到起从未被写入过。

---

## 三份素材分别被如何使用

### `Mili - world.execute (me) ;.mp3`

作品的声音本体，也是**全片唯一的时间基准**。

时长不是猜的 —— 直接解析 MPEG 帧头得到：
**8115 帧 × 1152 采样 ÷ 44100 Hz = 211.98367 秒**，
与 `.lrc` 里的 `[length:03:31.984]` 吻合。
这个数值硬编码在 `src/00_core.js` 的 `EM.AUDIO_END` 里，
并作为运行时自检的基准（`src/50_lrc.js`、`_tools/engine-check.js`）。

页面会依次尝试这些文件名，因为原始文件名里有两个极易被重命名吃掉的空格：

```
Mili - world.execute (me) ;.mp3     ← 首选，与 original/ 中的完全一致
Mili - world.execute(me) ;.mp3
Mili - world.execute (me);.mp3
Mili - world.execute(me);.mp3
audio.mp3
```

> 注：`original/` 是归档副本。要让作品直接运行，请把 mp3 放在与 `index.html`
> **同级**的位置（见 README 的"如果打开后没有声音"一节）。

### `world.execute (me) ;.mid`

130 BPM、4/4、3 轨、**615 个音符**的钢琴轨。
我解析出每个音符的起始时刻、音高范围、同发音符数与力度，
嵌入 `src/00_core.js` 的 `EM.ONSETS`（615 条 `[毫秒, 最低音, 最高音, 同发数, 力度]`）。

它的作用不是"配乐"，而是**让卡点踩在真实演奏的音符上**：
全片的脉冲、闪白、扩散环、刻度、粒子爆发，都由 `EM.onsetPulse(t, window)`
从这张表里取，而不是靠固定节拍推算。画面左侧那条音高条也是实时读它画的。

独立交叉验证：把 LRC 时间戳映射到 130 BPM 网格（每拍 0.461538 秒），
平均偏差约 0.11 秒 —— 这是原始录音人性化演奏造成的，
所以我以 **LRC 的实测时间轴为准、以 MIDI 为重音来源**。

### `world.execute(me)-timeline.lrc`

歌词与时间轴的事实来源。

它被**逐字节完整内嵌**在 `index.html` 的 `<script id="lrc-source">` 里，
运行时从这段内嵌文本解析，不访问任何在线歌词服务。

两处独立存在（内嵌块 vs. `original/` 里的文件）本身就是一道校验：
`src/50_lrc.js` 在每次页面加载时比对两者，`_tools/static-check.js`
和 `_tools/diff-lrc.js` 也在离线检查里比对，
任何一处改动都会立刻让 9 项验证中的 3 项失败。

那一行没有文字的 `[03:31.984]` 是结束标记，
作品在成片里把它记作 `(end)`，因此最后一帧正好落在音频终点的采样上。

---

## 版权

- 音乐、MIDI 与歌词时间轴版权归 **Mili** 所有。
- 本仓库的其余部分（动画、引擎、工具链）是对该作品的**独立视觉诠释**，
  非官方 PV，与 Mili 无隶属关系。
- 音频文件随仓库分发仅用于让演示可以直接双击运行；
  如需再利用，请自行确认授权。
