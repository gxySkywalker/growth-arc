# 小屋基础建筑 tileset v1

## 输入

向 GPT-Image 2 上传 `../reference/cottage-style-key-v1.png`。它只作为环境风格参考，不是编辑目标。

## 提示词

```text
Use case: stylized-concept
Asset type: production-oriented pixel-art cottage architecture tileset draft

Input image role: the attached cottage scene is the only environment style reference. Use it to preserve the warm timber colors, cream plaster walls, dark wooden trim, stone foundation, crisp pixel clusters, cozy medieval border-town character, and the same three-quarter top-down perspective. Do not edit or recreate the full room. Do not include its protagonist, dog, furniture, fireplace, books, plants, rugs, lamps, chest, window, or baked lighting.

Primary request: create one clean square sprite atlas containing only the reusable base architecture tiles needed to rebuild that cottage as an interactive tile map.

Logical specification: an exact 256x256 logical-pixel atlas arranged as an exact 8 by 8 grid of 32x32 logical-pixel cells, displayed enlarged with nearest-neighbor integer scaling. Every tile starts and ends exactly on the cell boundaries. No labels and no visible grid lines.

Required tile families:
- eight seamless warm wooden floor variants with matching plank boundaries
- horizontal and vertical wooden floor edge transitions
- four inner floor corners and four outer floor corners
- cream plaster wall center tiles with dark timber framing and wooden wainscot
- straight north, south, east, and west wall segments in the same three-quarter top-down perspective
- matching inner and outer wall corners
- wall top caps and stone foundation/base pieces
- bottom-boundary doorway pieces: left frame, right frame, top lintel, open center, wooden threshold
- wooden floor to dark snowy exterior transition pieces
- a few plain dark snow-ground tiles visible beyond the threshold

Unused cells: perfectly flat solid #ff00ff chroma-key color.

Style: original handcrafted pixel art, hard one-pixel clusters, limited shared palette of no more than 32 opaque asset colors plus #ff00ff, one-pixel dark colored outlines, consistent upper-left neutral light direction, no baked firelight or lamp glow.

Composition: isolated tiles only, orthographic three-quarter top-down construction matching the reference room. Full square atlas, no scene composition, no characters, no props.

Constraints: exact consistent logical pixel grid; every logical pixel enlarged by the same integer factor; tileable edges match exactly across neighboring cells; no anti-aliasing; no blur; no semi-transparent pixels; no soft shadows; no gradients; no noise texture; no fake high-resolution mosaic; no text; no numbers; no UI; no logo; no watermark. The #ff00ff background must be perfectly uniform with no shadows or texture, and #ff00ff must not appear inside any tile.

Avoid: complete room screenshot, furniture sheet, isometric tiles, side-view platform tiles, perspective painting, decorative borders, checkerboard transparency preview, labels, copied commercial tiles, neon colors, gothic horror.
```

## 说明

GPT-Image 2 的输出只作为逐格清理草稿。最终图集必须重排到 `../specs/cottage-architecture-v1.json` 声明的位置，清除洋红背景并通过 `npm run art:validate` 后才能进入运行时。
