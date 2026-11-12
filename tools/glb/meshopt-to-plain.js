#!/usr/bin/env node
/* Convert a GLB that uses EXT_meshopt_compression + KHR_mesh_quantization (+ EXT_texture_webp)
 * into a plain GLB (float32 attributes, uncompressed buffers) that any loader can read.
 * Geometry, skinning, morph targets, materials, textures and node hierarchy are preserved.
 * Usage: node meshopt-to-plain.js in.glb out.glb
 * Decoder written from the meshoptimizer bitstream spec (vertex codec v0, index codec v0/v1). */
const fs = require('fs');

function readGLB(p) {
  const d = fs.readFileSync(p); let o = 12, json = null, bin = null;
  while (o < d.length) { const l = d.readUInt32LE(o), t = d.readUInt32LE(o + 4), c = d.subarray(o + 8, o + 8 + l);
    if (t === 0x4E4F534A) json = JSON.parse(c.toString('utf8')); else if (t === 0x004E4942) bin = c; o += 8 + l; }
  return { json, bin };
}

/* ---------- vertex codec (version 0) ---------- */
function decodeVertex(src, count, stride) {
  if ((src[0] & 0xf0) !== 0xa0) throw new Error('bad vertex header ' + src[0].toString(16));
  if ((src[0] & 15) !== 0) throw new Error('unsupported vertex codec version ' + (src[0] & 15));
  const last = Uint8Array.from(src.subarray(src.length - stride)); // v0 keeps the first vertex in the final `stride` bytes
  const out = Buffer.alloc(count * stride);
  let blockMax = Math.min((Math.floor(8192 / stride)) & ~15, 256);
  const buf = new Uint8Array(256); let pos = 1;
  for (let vo = 0; vo < count; vo += blockMax) {
    const bc = Math.min(blockMax, count - vo), al = (bc + 15) & ~15;
    for (let k = 0; k < stride; k++) {
      const gc = al >> 4, hs = (gc + 3) >> 2, hp = pos; pos += hs;
      for (let g = 0; g < gc; g++) {
        const bits = (src[hp + (g >> 2)] >> ((g & 3) * 2)) & 3, b = g * 16;
        if (bits === 0) { for (let i = 0; i < 16; i++) buf[b + i] = 0; }
        else if (bits === 1) { let ex = pos + 4;
          for (let i = 0; i < 16; i++) { const e = (src[pos + (i >> 2)] >> (6 - (i & 3) * 2)) & 3; buf[b + i] = e === 3 ? src[ex++] : e; }
          pos = ex; }
        else if (bits === 2) { let ex = pos + 8;
          for (let i = 0; i < 16; i++) { const e = (src[pos + (i >> 1)] >> (4 - (i & 1) * 4)) & 15; buf[b + i] = e === 15 ? src[ex++] : e; }
          pos = ex; }
        else { for (let i = 0; i < 16; i++) buf[b + i] = src[pos + i]; pos += 16; }
      }
      let p = last[k];
      for (let i = 0; i < bc; i++) { const v = buf[i]; p = (p + (((v >> 1) ^ -(v & 1)) & 255)) & 255; out[(vo + i) * stride + k] = p; }
      last[k] = p;
    }
  }
  return out;
}

/* ---------- index codec ---------- */
function decodeTriangles(src, count, stride, starts) {
  const ver = src[0] & 15; if ((src[0] & 0xf0) !== 0xe0 || ver > 1) throw new Error('bad index header ' + src[0].toString(16));
  const fmax = ver >= 1 ? 13 : 15; // v1: fec 13 / 14 mean last-1 / last+1
  const out = stride === 2 ? new Uint16Array(count) : new Uint32Array(count);
  let codes = 1, data = 1 + count / 3; const aux = src.length - 16;
  const ef = new Uint32Array(32), vf = new Uint32Array(16); let eo = 0, vo = 0, next = 0, last = 0;
  const pushE = (a, b) => { ef[eo * 2] = a; ef[eo * 2 + 1] = b; eo = (eo + 1) & 15; };
  const pushV = (v, c = true) => { vf[vo] = v; vo = (vo + (c ? 1 : 0)) & 15; };
  const vbyte = () => { let l = src[data++]; if (l < 128) return l; let r = l & 127, s = 7;
    for (let i = 0; i < 4; i++) { const g = src[data++]; r |= (g & 127) << s; s += 7; if (g < 128) break; } return r >>> 0; };
  const idx = () => { const v = vbyte(); const d = (v >>> 1) ^ -(v & 1); last = (last + d) >>> 0; return last; };
  const spec = f => { if (f === 15) return idx(); last = (last + (f === 13 ? -1 : 1)) >>> 0; return last; }; // explicit or last±1
  for (let i = 0; i < count; i += 3) {
    if (starts.has(i)) next = 0; // gltfpack streams restart the 'next new vertex' counter at every primitive
    const ct = src[codes++]; let a, b, c;
    if (ct < 0xf0) {
      const fe = ct >> 4, e = (eo - 1 - fe) & 15; a = ef[e * 2]; b = ef[e * 2 + 1]; const fec = ct & 15;
      if (fec < fmax) { c = fec === 0 ? next : vf[(vo - 1 - fec) & 15]; const f0 = fec === 0; next += f0 ? 1 : 0; pushE(c, b); pushE(a, c); pushV(c, f0); }
      else { c = spec(fec); pushE(c, b); pushE(a, c); pushV(c); }
    } else if (ct < 0xfe) {
      const ca = src[aux + (ct & 15)], feb = ca >> 4, fec = ca & 15;
      a = next++; const b0 = feb === 0; b = b0 ? next : vf[(vo - feb) & 15]; next += b0 ? 1 : 0;
      const c0 = fec === 0; c = c0 ? next : vf[(vo - fec) & 15]; next += c0 ? 1 : 0;
      pushE(a, b); pushE(b, c); pushE(c, a); pushV(a); pushV(b, b0); pushV(c, c0);
    } else {
      const ca = src[data++], fea = ct === 0xfe ? 0 : 15, feb = ca >> 4, fec = ca & 15;
      const get = f => f === 0 ? next++ : f === 15 ? idx() : vf[(vo - f) & 15]; // slow path: 13/14 are plain FIFO slots, only 15 is explicit
      a = get(fea); b = get(feb); c = get(fec);
      pushE(a, b); pushE(b, c); pushE(c, a);
      pushV(a, fea === 0 || fea === 15); pushV(b, feb === 0 || feb === 15); pushV(c, fec === 0 || fec === 15);
    }
    out[i] = a; out[i + 1] = b; out[i + 2] = c;
  }
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

/* ---------- main ---------- */
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const CS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
function convert(inp, outp) {
  const { json: j, bin } = readGLB(inp);
  // 1. materialise every buffer view
  const views = j.bufferViews.map((bv, bi) => {
    const e = bv.extensions && bv.extensions.EXT_meshopt_compression;
    if (!e) return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    const src = bin.subarray(e.byteOffset || 0, (e.byteOffset || 0) + e.byteLength);
    if (e.filter && e.filter !== 'NONE') throw new Error('filter ' + e.filter + ' not implemented');
    if (e.mode === 'ATTRIBUTES') return decodeVertex(src, e.count, e.byteStride);
    if (e.mode === 'TRIANGLES') { const st = new Set(j.accessors.filter(a => a.bufferView === bi).map(a => (a.byteOffset || 0) / e.byteStride)); return decodeTriangles(src, e.count, e.byteStride, st); }
    throw new Error('mode ' + e.mode);
  });
  // 2. read an accessor to Float32/typed values
  const read = a => {
    const bv = j.bufferViews[a.bufferView], v = views[a.bufferView], n = NC[a.type], cs = CS[a.componentType];
    const stride = (bv.extensions && bv.extensions.EXT_meshopt_compression ? bv.extensions.EXT_meshopt_compression.byteStride : bv.byteStride) || n * cs;
    const dv = new DataView(v.buffer, v.byteOffset, v.byteLength), out = new Array(a.count * n);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
      const o = (a.byteOffset || 0) + i * stride + k * cs; let x;
      switch (a.componentType) { case 5120: x = dv.getInt8(o); break; case 5121: x = dv.getUint8(o); break; case 5122: x = dv.getInt16(o, true); break;
        case 5123: x = dv.getUint16(o, true); break; case 5125: x = dv.getUint32(o, true); break; default: x = dv.getFloat32(o, true); }
      if (a.normalized) { const m = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType]; x = Math.max(x / m, a.componentType === 5120 || a.componentType === 5122 ? -1 : 0); }
      out[i * n + k] = x;
    }
    return out;
  };
  // 3. rebuild
  const chunks = []; let total = 0;
  const addChunk = (buf, target) => { const pad = (4 - (total % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); total += pad; }
    const bv = { buffer: 0, byteOffset: total, byteLength: buf.length }; if (target) bv.target = target; chunks.push(buf); total += buf.length; return bv; };
  const newBV = [], newAcc = [];
  const putAcc = (src, vals, kind) => { // kind: 'f32' | 'u8' | 'u16' | 'u32' | 'raw'
    const n = NC[src.type]; let arr, ct;
    if (kind === 'f32') { arr = Float32Array.from(vals); ct = 5126; } else if (kind === 'u8') { arr = Uint8Array.from(vals); ct = 5121; }
    else if (kind === 'u16') { arr = Uint16Array.from(vals); ct = 5123; } else { arr = Uint32Array.from(vals); ct = 5125; }
    const bv = addChunk(Buffer.from(arr.buffer), kind === 'u16' || kind === 'u32' ? 34963 : 34962); newBV.push(bv);
    const acc = { bufferView: newBV.length - 1, componentType: ct, count: src.count, type: src.type };
    if (src.type === 'VEC3' && src.min === undefined && kind === 'f32') {
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < src.count; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], vals[i * 3 + k]); mx[k] = Math.max(mx[k], vals[i * 3 + k]); }
      acc.min = mn; acc.max = mx; }
    newAcc.push(acc); return newAcc.length - 1;
  };
  const cache = new Map();
  const conv = (ai, role) => { const key = ai + role; if (cache.has(key)) return cache.get(key);
    const a = j.accessors[ai], vals = read(a); let r;
    if (role === 'idx') {  r = putAcc(a, vals, a.componentType === 5125 ? 'u32' : 'u16'); }
    else if (role === 'joints') r = putAcc(a, vals, a.componentType === 5123 ? 'u16' : 'u8');
    else if (role === 'weights') { for (let i = 0; i < a.count; i++) { let s = 0; for (let k = 0; k < 4; k++) s += vals[i * 4 + k]; if (s > 0) for (let k = 0; k < 4; k++) vals[i * 4 + k] /= s; } r = putAcc(a, vals, 'f32'); }
    else r = putAcc(a, vals, 'f32');
    cache.set(key, r); return r; };
  for (const m of j.meshes) for (const p of m.primitives) {
    if (p.indices !== undefined) { p.indices = conv(p.indices, 'idx'); const vc = j.accessors[p.attributes.POSITION].count; const ia = newAcc[p.indices]; ia._vc = vc; }
    for (const k of Object.keys(p.attributes)) p.attributes[k] = conv(p.attributes[k], k.startsWith('JOINTS') ? 'joints' : k.startsWith('WEIGHTS') ? 'weights' : 'f32');
    if (p.targets) p.targets = p.targets.map(t => { const o = {}; for (const k of Object.keys(t)) o[k] = conv(t[k], 'f32'); return o; });
  }
  for (const s of j.skins || []) if (s.inverseBindMatrices !== undefined) { const a = j.accessors[s.inverseBindMatrices]; s.inverseBindMatrices = putAcc(a, read(a), 'f32'); }
  for (const im of j.images || []) { const bv = j.bufferViews[im.bufferView]; const raw = views[im.bufferView]; newBV.push(addChunk(Buffer.from(raw))); im.bufferView = newBV.length - 1; }
  for (const t of j.textures || []) { const e = t.extensions && t.extensions.EXT_texture_webp; if (e) { t.source = e.source; delete t.extensions; } }
  j.bufferViews = newBV; j.accessors = newAcc; j.buffers = [{ byteLength: total }];
  delete j.extensionsUsed; delete j.extensionsRequired;
  j.asset = Object.assign({}, j.asset, { generator: 'OpenWalls meshopt-to-plain' });
  const jb = Buffer.from(JSON.stringify(j)); const jp = Buffer.concat([jb, Buffer.alloc((4 - jb.length % 4) % 4, 0x20)]);
  const bb = Buffer.concat(chunks); const bp = Buffer.concat([bb, Buffer.alloc((4 - bb.length % 4) % 4)]);
  const hdr = Buffer.alloc(12); hdr.write('glTF'); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + jp.length + 8 + bp.length, 8);
  const h1 = Buffer.alloc(8); h1.writeUInt32LE(jp.length); h1.writeUInt32LE(0x4E4F534A, 4);
  const h2 = Buffer.alloc(8); h2.writeUInt32LE(bp.length); h2.writeUInt32LE(0x004E4942, 4);
  fs.writeFileSync(outp, Buffer.concat([hdr, h1, jp, h2, bp]));
  return j;
}
if (require.main === module) { const j = convert(process.argv[2], process.argv[3]); console.log('wrote', process.argv[3], 'accessors', j.accessors.length); }
module.exports = { convert };
