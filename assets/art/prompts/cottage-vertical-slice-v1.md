# 边境小屋美术垂直切片 v1

## 使用方式

1. 向 GPT-Image 2 上传 `../reference/protagonist-style-key-v1.png`。
2. 明确告诉模型：图片只作为主角身份与气质参考，不是编辑目标。
3. 完整复制下方提示词，一次只生成一张。
4. 第一轮只判断整体世界是否成立，不把生成图直接当作 spritesheet。

## 提示词

```text
Use case: stylized-concept
Asset type: production-oriented game art vertical slice, one in-game screenshot

Input image role: the attached image is a style and character anchor only. Preserve the protagonist's kind youthful personality, brown hair, short forest-green cloak, cream tunic, brown travel gear, compact chibi proportions, and warm earthy palette. Ignore and remove the magenta background. Do not copy its oversized canvas, front-facing presentation, or fused equipment construction.

Primary request: create one original, cozy, playable-looking pixel-art scene inside the protagonist's small cottage in a mysterious medieval border town. This is a real game screenshot reference, not concept art, not a character sheet, and not an illustration.

Scene: a compact wooden-and-stone cottage interior at winter night; lit fireplace, simple bed with quilt, writing desk with an open adventure journal, wooden chest, small bookshelf, travel satchel, and a window showing dark blue night and a little snow outside. The room must feel private, safe, intimate, lived-in, and quietly magical, like returning under a warm blanket after an expedition.

Subject: the same young traveler stands naturally near the center-left in a readable three-quarter top-down game pose; a small friendly floppy-eared dog sits close beside him. Both are fully visible and clearly belong to the same world.

Style: high-quality original handcrafted pixel art for a cozy medieval adventure RPG; crisp intentional pixel clusters; expressive silhouettes; refined environment detail; limited shared palette of about 32 to 40 colors; warm amber interior light against cool blue window light. Use the readability principles of classic top-down handheld and farming RPGs without imitating, tracing, or reproducing any existing game's assets, characters, tiles, interface, palette, or trade dress.

Composition: exact 16:9 game viewport, orthographic three-quarter top-down view, approximately a 320x180 logical canvas enlarged with nearest-neighbor integer scaling. Use a consistent 16x16 or 32x32 tile grid. Protagonist logical footprint about 32x48 pixels; dog about 24x24 to 32x32 pixels. Furniture aligns to the same tile grid. Leave clear walkable floor paths and believable collision space. One complete room only.

Lighting and mood: gentle fireplace flicker implied through pixel clusters, soft amber pools of light, cozy shadows, calm winter-night refuge, personal and affectionate rather than epic or technological.

Constraints: every visible edge follows one consistent logical pixel grid; hard pixel edges; no anti-aliasing; no blurry scaling; no smooth vector curves; no painterly brushwork; no fake high-resolution mosaic blocks; no gradients except stepped pixel-cluster light bands; consistent outline weight; consistent light direction; readable at native logical size; no user interface; no text; no logos; no watermark.

Avoid: anime illustration, tall body proportions, side-scrolling platformer view, isometric view, dollhouse cutaway, realistic rendering, 3D render, parchment background, neon colors, sci-fi elements, gothic horror, excessive clutter, empty oversized room, multiple characters, duplicate protagonist, weapon drawn, combat pose, direct imitation of Pokémon or Stardew Valley.
```

## 首轮验收

- 缩小观看时仍能一眼认出主角和小狗。
- 主角像住在房间里，而不是被粘贴到背景上。
- 家具有统一网格、透视和碰撞空间，房间看起来可以行走。
- 暖光与冬夜冷光都由清晰像素簇表达，没有平滑渐变。
- 第一感受是私人、安全、想回来的家，而不是展示用概念图。
- 不出现任何现有商业游戏可直接识别的角色、图块或界面设计。

## 通过后才做

1. 从场景反推共享调色板。
2. 单独绘制小屋 tileset 与家具图集。
3. 清理 32×48 主角四方向待机和行走帧。
4. 拆分身体、服装、披风、武器与背包图层。
5. 制作 32×32 小狗图集。
6. 将生产 PNG 登记到 `../manifest.json` 并运行 `npm run art:validate`。
