# OpenWalls avatars (GLB engine)

Avatars are the supplied rigged GLB (`assets/avatars/female.glb`), driven in place. No body is generated from primitives.

## Pipeline
- `tools/glb/meshopt-to-plain.js in.glb out.glb` unpacks meshopt/quantised/webp GLBs into plain GLB (the sandbox had no decoder).
- `src/ow/glb-lite.js` loads plain GLB into three r128 (skeleton, skin weights, morph targets, PBR materials).
- `src/ow/avatar.js` customises it live: `OWA.build(cfg)` -> `av.apply(cfg)`.

## What the model really supports
| Feature | Status |
|---|---|
| Skin tone | Works (material tint on body and head) |
| Face expressions and fine-tune | Works (ARKit morph targets, 8 presets + 11 sliders, blinking) |
| Eye colour | Works (iris recoloured in the eye texture) |
| Hair colour | Works |
| Hairstyle | Built-in bob, none, plus 4 simple built-in styles (buzz, afro, bun, long) from `src/ow/avatar-wear.js`. Stylised, not professional models |
| Body proportions | Works via bones: height, shoulders, chest, waist, hips, arm/leg/neck length, head/hand/foot size |
| Clothing and shoe colours, glasses, barefoot | Works (tint / hide) |
| Facial shape (nose, jaw, lips), muscle definition | NOT supported (no such morph targets) |
| Garments and hats | Built-in simple pieces: tee, tank, sweater, shorts, skirt, cap, beanie. Made from the model's own top/bottom meshes (same skin weights) or small procedural meshes on the skeleton. Real garments: `av.attach(slot,url,opts)` accepts GLBs authored on the same skeleton; list them in `assets/avatars/catalog.json` |

Note: the supplied body has no legs of its own (the leggings are the legs) and no upper arms, so bare legs/arms are skin-coloured shells of the same meshes (flat colour, no skin texture).
| Male | Same rig with male proportions (`OWA.MODELS.m`). Drop in `male.glb` and set `proxy:false` for a true male |

`Nova-11.glb` is a static, unrigged scan: it cannot walk or be customised, so it is not used.

## Not tested
Real Android phone, live Supabase, performance on low-end GPUs. Tested headless (swiftshader): walk, sit, lie, wave, editor.
