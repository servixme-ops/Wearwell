/* OpenWalls — minimal GLB loader for three.js r128 (no examples/ loaders needed, works offline).
 * Reads plain glTF-binary 2.0 (use tools/glb/meshopt-to-plain.js to unpack meshopt/quantised files).
 * Preserves: node hierarchy, skins + inverse bind matrices, SkinnedMesh weights, morph targets + names,
 * PBR materials (factors, baseColor / metallicRoughness maps), double-sided/alpha flags, embedded images.
 * OWGLB.load(url) -> Promise<{ scene, skinned:{name:SkinnedMesh}, bones:{name:Bone}, morphs:[names], rig }> */
(function (g) {
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const TA = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

  function split(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a GLB');
    let o = 12, json = null, bin = null;
    while (o < buf.byteLength) {
      const l = dv.getUint32(o, true), t = dv.getUint32(o + 4, true);
      if (t === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o + 8, l)));
      else if (t === 0x004E4942) bin = buf.slice(o + 8, o + 8 + l);
      o += 8 + l;
    }
    return { json, bin };
  }

  function parse(buf, opts) {
    opts = opts || {};
    const T = g.THREE, { json: J, bin } = split(buf);
    const ext = (J.extensionsRequired || []).filter(e => e !== 'EXT_texture_webp');
    if (ext.length) throw new Error('GLB needs unsupported extensions: ' + ext.join(','));

    const bvData = i => { const b = J.bufferViews[i]; return new Uint8Array(bin, b.byteOffset || 0, b.byteLength); };
    const acc = i => {
      const a = J.accessors[i], bv = J.bufferViews[a.bufferView], n = NC[a.type], C = TA[a.componentType];
      const off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride;
      if (!stride || stride === n * C.BYTES_PER_ELEMENT) return { arr: new C(bin.slice(off, off + a.count * n * C.BYTES_PER_ELEMENT)), n, a };
      const out = new C(a.count * n), dv = new DataView(bin);
      for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv['get' + C.name.replace('Array', '')](off + k * stride + c * C.BYTES_PER_ELEMENT, true);
      return { arr: out, n, a };
    };
    const attr = i => { const r = acc(i); return new T.BufferAttribute(r.arr, r.n, !!r.a.normalized); };

    /* textures (decoded lazily by the browser; webp/png/jpeg all fine) */
    const texCache = {};
    const tex = (ti, srgb) => {
      if (ti === undefined) return null;
      const key = ti + (srgb ? 's' : 'l'); if (texCache[key]) return texCache[key];
      const tdef = J.textures[ti], im = J.images[tdef.source];
      const blob = new Blob([bvData(im.bufferView)], { type: im.mimeType || 'image/png' });
      const url = URL.createObjectURL(blob), img = new Image();
      const t = new T.Texture(img); t.flipY = false; t.anisotropy = 4;
      if (srgb) t.encoding = T.sRGBEncoding;
      const sm = tdef.sampler !== undefined ? J.samplers[tdef.sampler] : {};
      t.wrapS = sm.wrapS === 33071 ? T.ClampToEdgeWrapping : sm.wrapS === 33648 ? T.MirroredRepeatWrapping : T.RepeatWrapping;
      t.wrapT = sm.wrapT === 33071 ? T.ClampToEdgeWrapping : sm.wrapT === 33648 ? T.MirroredRepeatWrapping : T.RepeatWrapping;
      t._ready = new Promise(res => { img.onload = () => { t.needsUpdate = true; res(t); }; img.onerror = () => res(t); });
      img.src = url; texCache[key] = t; return t;
    };

    const matCache = {};
    const material = (mi, skinned, morph) => {
      const key = mi + '|' + (skinned ? 1 : 0) + (morph ? 1 : 0); if (matCache[key]) return matCache[key];
      const d = mi === undefined ? {} : J.materials[mi], pb = d.pbrMetallicRoughness || {};
      const m = new T.MeshStandardMaterial({ name: d.name || '', roughness: pb.roughnessFactor === undefined ? 1 : pb.roughnessFactor, metalness: pb.metallicFactor === undefined ? 1 : pb.metallicFactor });
      if (pb.baseColorFactor) { m.color.setRGB(pb.baseColorFactor[0], pb.baseColorFactor[1], pb.baseColorFactor[2]); m.opacity = pb.baseColorFactor[3]; }
      if (pb.baseColorTexture) m.map = tex(pb.baseColorTexture.index, true);
      if (pb.metallicRoughnessTexture) { const t = tex(pb.metallicRoughnessTexture.index, false); m.roughnessMap = t; m.metalnessMap = t; }
      if (d.normalTexture) { m.normalMap = tex(d.normalTexture.index, false); }
      if (d.emissiveFactor) m.emissive.setRGB(d.emissiveFactor[0], d.emissiveFactor[1], d.emissiveFactor[2]);
      if (d.emissiveTexture) { m.emissiveMap = tex(d.emissiveTexture.index, true); }
      if (d.doubleSided) m.side = T.DoubleSide;
      if (d.alphaMode === 'BLEND') m.transparent = true;
      if (d.alphaMode === 'MASK') m.alphaTest = d.alphaCutoff === undefined ? .5 : d.alphaCutoff;
      m.skinning = !!skinned; m.morphTargets = !!morph; m.morphNormals = false;
      matCache[key] = m; return m;
    };

    /* nodes */
    const jointSet = new Set(); (J.skins || []).forEach(s => s.joints.forEach(j => jointSet.add(j)));
    const nodes = J.nodes.map((n, i) => {
      const o = jointSet.has(i) ? new T.Bone() : new T.Object3D(); o.name = n.name || ('node' + i);
      if (n.matrix) { new T.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale); }
      else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); }
      return o;
    });
    const skinned = {}, bones = {}, morphSet = new Set(), meshes = {};
    const pendingSkin = [];
    J.nodes.forEach((n, i) => {
      if (n.mesh === undefined) return;
      const md = J.meshes[n.mesh], p = md.primitives[0], isSkin = n.skin !== undefined;
      const geo = new T.BufferGeometry();
      geo.setIndex(attr(p.indices));
      const A = p.attributes;
      geo.setAttribute('position', attr(A.POSITION));
      if (A.NORMAL !== undefined) geo.setAttribute('normal', attr(A.NORMAL)); else geo.computeVertexNormals();
      if (A.TEXCOORD_0 !== undefined) geo.setAttribute('uv', attr(A.TEXCOORD_0));
      if (isSkin) { geo.setAttribute('skinIndex', attr(A.JOINTS_0)); geo.setAttribute('skinWeight', attr(A.WEIGHTS_0)); }
      const names = (md.extras && md.extras.targetNames) || [];
      let morph = false;
      if (p.targets && p.targets.length) {
        morph = true; geo.morphTargetsRelative = true;
        geo.morphAttributes.position = p.targets.map(t => attr(t.POSITION));
        names.forEach(x => morphSet.add(x));
      }
      geo.computeBoundingSphere();
      if (isSkin) geo.boundingSphere.radius = 1e4; // skinned bounds are unreliable; never frustum-cull the avatar
      const mat = material(p.material, isSkin, morph);
      const mesh = isSkin ? new T.SkinnedMesh(geo, mat) : new T.Mesh(geo, mat);
      mesh.name = n.name || md.name || ('mesh' + i); mesh.frustumCulled = false;
      if (morph) {
        mesh.morphTargetInfluences = new Array(p.targets.length).fill(0);
        mesh.morphTargetDictionary = {}; names.forEach((x, k) => { mesh.morphTargetDictionary[x] = k; });
      }
      if (isSkin && opts.gltfSkin) mesh.userData.free = true; else nodes[i].add(mesh);
      meshes[mesh.name] = mesh;
      if (isSkin) { skinned[mesh.name] = mesh; pendingSkin.push([mesh, J.skins[n.skin]]); }
    });
    J.nodes.forEach((n, i) => (n.children || []).forEach(c => nodes[i].add(nodes[c])));
    const scene = new T.Group(); scene.name = 'avatar';
    /* glTF semantics: a skinned mesh ignores its node transform (some exporters, e.g. Sketchfab/FBX, put a 100x armature above it) */
    Object.values(skinned).forEach(m => { if (m.userData.free) scene.add(m); });
    (J.scenes[J.scene || 0].nodes || []).forEach(i => scene.add(nodes[i]));
    scene.updateMatrixWorld(true);
    pendingSkin.forEach(([mesh, s]) => {
      const bs = s.joints.map(j => nodes[j]);
      const ibm = s.inverseBindMatrices !== undefined ? acc(s.inverseBindMatrices).arr : null;
      const inv = bs.map((b, k) => ibm ? new T.Matrix4().fromArray(ibm, k * 16) : new T.Matrix4());
      mesh.bind(new T.Skeleton(bs, inv), mesh.matrixWorld);
    });
    nodes.forEach(o => { if (o.isBone) bones[o.name] = o; });
    const all = []; Object.values(texCache).forEach(t => all.push(t._ready));
    return Promise.all(all).then(() => ({ scene, skinned, meshes, bones, morphs: Array.from(morphSet), materials: Object.values(matCache), json: J }));
  }

  g.OWGLB = {
    parse,
    load(url) { return fetch(url).then(r => { if (!r.ok) throw new Error('GLB ' + r.status); return r.arrayBuffer(); }).then(parse); }
  };
})(window);
