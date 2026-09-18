# 初始提示词（原文）

> 这是本项目收到的唯一一次创作委托，逐字保留，未作任何修改。
> 我在此之后的所有判断、取舍与实现，都是对下面这段话的回应。

---

请使用我提供的《world.execute(me);》音频文件、midi文件与歌词文件，创作一部完整的网页动画作品。

请先完整理解歌曲的歌词、隐喻、情绪和音乐结构，再根据你自己的理解，自主决定视觉风格、叙事方式、色彩、构图与技术方案。鼓励原创、自由和具有个人风格的表达；可以联网搜索所有你需要的内容，但不必模仿官方 PV，也不要被固定的代码风、3D、粒子或任何预设形式限制。

必须满足：

1. 动画覆盖整首音频，包括前奏、间奏、停顿和尾奏。
2. 每一句歌词都有与其含义或情绪对应的独立视觉表达；重复歌词也要根据上下文产生变化。
3. 歌词、节奏、重音、转场和情绪变化需要准确卡点。
4. 以 audio.currentTime 作为唯一时间基准，通过 requestAnimationFrame 驱动动画，确保暂停、继续和跳转后仍然同步。
5. 实现开始、暂停、重播、进度跳转、音量、全屏和毫秒级同步偏移调节。
6. 可以使用 HTML、CSS、JavaScript、Canvas、WebGL、Three.js 或任何合适的网页技术。
7. 最终作品必须能够直接双击 index.html 运行，无需安装依赖、执行构建命令、启动服务器或访问网络。
8. 歌词及时间轴必须随作品保存在本地代码中，运行时不能依赖在线歌词服务。
9. 不要只输出方案、分镜或代码片段，请直接创建完整可运行的项目。
10. 完成前实际验证：歌词动画覆盖率为 100%，动画终点与音频时长一致，任意跳转后画面正确恢复，且不存在资源缺失或控制台错误。

技术要求只用于保证作品完整和同步，不得限制你的艺术理解与创造力。请创作出属于你自己的《world.execute(me);》。

---

（英文原文）

Please use the 《world.execute(me);》 audio file, MIDI file and lyric file I provided to create a complete web animation work.

Please first fully understand the song's lyrics, metaphors, emotions and musical structure, then based on your own understanding, independently decide the visual style, narrative approach, colour, composition and technical plan. Originality, freedom and personal expression are encouraged; you may search online for anything you need, but you need not imitate the official PV, and you should not be constrained by a fixed code aesthetic, 3D, particles or any preset form.

Must satisfy:

1. The animation covers the entire audio, including intro, interludes, pauses and outro.
2. Every lyric line has its own visual expression corresponding to its meaning or emotion; repeated lyrics must also vary according to context.
3. Lyrics, rhythm, accents, transitions and emotional changes must be accurately synced.
4. Use audio.currentTime as the sole time base, driven by requestAnimationFrame, ensuring synchronisation is maintained after pause, resume and seeking.
5. Implement start, pause, replay, progress seeking, volume, fullscreen and millisecond-level sync offset adjustment.
6. HTML, CSS, JavaScript, Canvas, WebGL, Three.js or any suitable web technology may be used.
7. The final work must run by directly double-clicking index.html, with no dependency installation, build command, server startup or network access.
8. The lyrics and timeline must be stored locally in the work's own code; no online lyric service may be relied upon at runtime.
9. Do not output only a plan, storyboard or code fragments — directly create a complete, runnable project.
10. Before completion, actually verify: lyric animation coverage is 100%, the animation's end point matches the audio duration, the picture recovers correctly after any seek, and there are no missing resources or console errors.

The technical requirements serve only to guarantee the work's completeness and synchronisation, and must not restrict your artistic understanding or creativity. Please create your own 《world.execute(me);》.
