// WebGL2 black hole renderer (Gargantua-style).
//
// Light rays are traced backwards through Schwarzschild spacetime (units:
// Schwarzschild radius = 1), so the accretion disk's far side is lensed over
// the top and under the shadow, and a photon ring forms at the shadow's edge.
//
// The camera never moves, so the expensive part — where every pixel's ray
// lands on the disk — is identical every frame. It's traced once into float
// textures (spread over a few frames so nothing hitches), and each frame only
// shades the disk from those lookups plus a mipmapped noise texture. That makes
// full Retina resolution cheap. Devices without float render targets fall back
// to tracing every frame at a lower resolution.

// Camera framing — exported so StarField can size hit areas to match.
export const ASPECT = 2;               // canvas width / height
const CAM_DIST = 28;
const CAM_INCL = 0.16;                 // radians above the disk plane
const CAM_ROLL = -0.07;                // slight tilt, like the film shot
const TAN_FOV = 0.27;                  // tan(vertical half-FOV)
// apparent shadow radius (critical impact parameter 3√3/2) as a fraction of half-height
export const SHADOW_FRAC = (2.598 / CAM_DIST) / TAN_FOV;

const NOISE_SIZE = 1024;
const GEOMETRY_PX_PER_FRAME = 250000;  // pixels traced per frame while baking

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
`;

// Tileable fbm (r) + ridged fbm (g), baked once into a mipmapped texture.
const NOISE_FRAG = `${HEAD}
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p, float per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 i0 = mod(i, per);
  vec2 i1 = mod(i + 1.0, per);
  float a = hash21(i0);
  float b = hash21(vec2(i1.x, i0.y));
  float c = hash21(vec2(i0.x, i1.y));
  float d = hash21(i1);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / ${NOISE_SIZE.toFixed(1)};
  float fbm = 0.0;
  float ridge = 0.0;
  float amp = 0.5;
  float total = 0.0;
  float per = 4.0;
  for (int i = 0; i < 8; i++) {
    float n = vnoise(uv * per + float(i) * 17.0, per);
    fbm += amp * n;
    ridge += amp * pow(1.0 - abs(2.0 * n - 1.0), 3.0);
    total += amp;
    amp *= 0.55;
    per *= 2.0;
  }
  outColor = vec4(fbm / total, ridge / total, 0.0, 1.0);
}
`;

const COMMON = `
const float R_IN = 2.6;
const float R_OUT = 12.0;
const float RB = 20.0;       // integrate only inside this sphere
const float TAU = 6.2831853;
const float B_CRIT = 2.598;

uniform vec2 uRes;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

vec2 screenUV() {
  return (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
}

vec3 rayDir(vec2 uv) {
  return normalize(uCamFwd + (uv.x * uCamRight + uv.y * uCamUp) * ${TAN_FOV.toFixed(4)});
}

// radial brightness/opacity envelope of the disk, x = 0 at the inner edge, 1 at the outer
float diskEdge(float x) {
  return smoothstep(0.0, 0.16, x) * pow(1.0 - x, 1.6);
}
`;

// Traces one ray. g0 = (r, phi) of the first two disk crossings (r = 0: none).
// g1 = (doppler factor of each crossing, haze, captured ? -1 : lensed starlight).
const TRACE = `
#define MAX_STEPS 160

float doppler(vec3 p, float r, vec3 dir) {
  float v = sqrt(0.5 / r);
  vec3 vdir = vec3(-p.z, 0.0, p.x) / r;
  return 1.0 / (inversesqrt(1.0 - v * v) * (1.0 - v * dot(vdir, -dir)));
}

float stars(vec3 d) {
  vec3 q = d * 40.0;
  vec3 id = floor(q);
  float h = hash31(id);
  if (h < 0.94) return 0.0;
  vec3 o = vec3(hash31(id + 7.1), hash31(id + 3.3), hash31(id + 5.7)) - 0.5;
  float dd = length(fract(q) - 0.5 - o * 0.5);
  return smoothstep(0.09, 0.0, dd) * (h - 0.94) * 14.0;
}

void trace(vec3 rd, out vec4 g0, out vec4 g1) {
  g0 = vec4(0.0);
  vec2 dop = vec2(1.0);
  float glow = 0.0;
  float trans = 1.0;
  float captured = 0.0;
  int hits = 0;
  vec3 outDir = rd;

  float b = dot(uCamPos, rd);
  float disc = b * b - dot(uCamPos, uCamPos) + RB * RB;
  if (disc > 0.0) {
    vec3 pos = uCamPos + rd * (-b - sqrt(disc));
    vec3 vel = rd;
    vec3 L = cross(pos, vel);
    float h2 = dot(L, L);

    for (int i = 0; i < MAX_STEPS; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      float dt = 0.045 * r;

      // null geodesic: x'' = -1.5 h^2 x / r^5
      vel -= 1.5 * h2 * pos / (r2 * r2 * r) * dt;
      vec3 np = pos + vel * dt;

      // soft volumetric haze hugging the disk plane
      float rc = length(pos.xz);
      float gp = smoothstep(R_IN * 0.95, R_IN * 1.6, rc) * smoothstep(R_OUT, R_IN, rc);
      glow += trans * gp * exp(-pos.y * pos.y * 2.2) * dt * (R_IN / rc);

      if (pos.y * np.y < 0.0) {
        vec3 hit = mix(pos, np, pos.y / (pos.y - np.y));
        float hr = length(hit.xz);
        if (hr > R_IN && hr < R_OUT) {
          vec2 rp = vec2(hr, atan(hit.z, hit.x));
          float dp = doppler(hit, hr, normalize(vel));
          if (hits == 0) { g0.xy = rp; dop.x = dp; }
          else if (hits == 1) { g0.zw = rp; dop.y = dp; }
          hits++;
          // time-averaged opacity, used to weight the static light
          trans *= 1.0 - clamp(1.1 * diskEdge((hr - R_IN) / (R_OUT - R_IN)), 0.0, 0.96);
        }
      }

      pos = np;
      float nr2 = dot(pos, pos);
      if (nr2 < 1.02) { captured = 1.0; break; }
      if (nr2 > RB * RB && dot(pos, vel) > 0.0) break;
    }
    outDir = normalize(vel);
  }

  g1 = vec4(dop, glow, captured > 0.5 ? -1.0 : trans * stars(outDir));
}
`;

const SHADE = `
uniform sampler2D uNoise;
uniform float uTime;
uniform float uFade;
uniform float uHover;

const float KU = 3.0;    // noise repeats around the disk (integer keeps it seamless)
const float KV = 0.3;    // noise repeats per unit radius

vec2 noiseAt(vec2 uv, vec2 dx, vec2 dy) {
  return textureGrad(uNoise, uv, dx, dy).rg;
}

// emission (premultiplied rgb) and opacity of one lensed image of the disk
vec4 disk(float r, float phi, float dop) {
  float x = (r - R_IN) / (R_OUT - R_IN);
  float on = step(0.001, r) * step(0.0, x) * step(x, 1.0);
  r = max(r, R_IN);

  // phi wraps at ±π; take screen derivatives from whichever parameterization is continuous
  float u = phi / TAU;
  float uf = fract(u);
  float ux = dFdx(u), uy = dFdy(u);
  float ufx = dFdx(uf), ufy = dFdy(uf);
  ux = abs(ufx) < abs(ux) ? ufx : ux;
  uy = abs(ufy) < abs(uy) ? ufy : uy;
  vec2 rd = vec2(dFdx(r), dFdy(r));
  // Neighboring pixels can see different lensed images of the disk (e.g. where the
  // faded front edge meets the lower arc). Those jumps aren't real gradients and would
  // pick a far-too-blurry mip in 2x2 blocks — visible as dashed lines — so drop them.
  rd *= step(abs(rd), vec2(1.0));
  ux *= step(abs(ux), 0.08);
  uy *= step(abs(uy), 0.08);

  // Keplerian shear, cross-faded between two resetting layers so it never winds up
  float omega = 2.4 * pow(r, -1.5);
  float cyc = uTime / 14.0;
  float f1 = fract(cyc);
  float f2 = fract(cyc + 0.5);
  float w = abs(2.0 * f1 - 1.0);
  float s1 = omega * f1 * 14.0 / TAU;
  float s2 = omega * f2 * 14.0 / TAU;
  // shear derivatives via the chain rule, so they inherit the cleaned-up radius derivative
  float dsdr = -1.5 / r;
  vec2 dx1 = vec2((ux - s1 * dsdr * rd.x) * KU, rd.x * KV);
  vec2 dy1 = vec2((uy - s1 * dsdr * rd.y) * KU, rd.y * KV);
  vec2 dx2 = vec2((ux - s2 * dsdr * rd.x) * KU, rd.x * KV);
  vec2 dy2 = vec2((uy - s2 * dsdr * rd.y) * KU, rd.y * KV);
  vec2 uv1 = vec2((u - s1) * KU, r * KV);
  vec2 uv2 = vec2((u - s2) * KU, r * KV) + vec2(0.37, 0.61);

  vec2 coarse = mix(noiseAt(uv1, dx1, dy1), noiseAt(uv2, dx2, dy2), w);
  vec2 fine = mix(noiseAt(uv1 * 3.0 + 0.21, dx1 * 3.0, dy1 * 3.0),
                  noiseAt(uv2 * 3.0 + 0.53, dx2 * 3.0, dy2 * 3.0), w);
  // blending two uncorrelated layers flattens contrast mid-fade; restore it
  float norm = inversesqrt(w * w + (1.0 - w) * (1.0 - w));
  coarse = (coarse - 0.5) * norm + 0.5;
  fine = (fine - 0.5) * norm + 0.5;

  float n = smoothstep(0.25, 0.75, coarse.r * 0.7 + fine.r * 0.3);
  float fil = smoothstep(0.1, 0.6, coarse.g * 0.5 + fine.g * 0.5);
  float lanes = 0.85 + 0.15 * sin(r * 18.0 + n * 9.0);
  float dens = (0.2 + 1.2 * n) * (0.65 + 0.7 * fil) * lanes;

  float edge = diskEdge(x);
  float heat = pow(R_IN / r, 1.1);
  // relativistic beaming (toned down, as in the film) + gravitational redshift
  float beam = mix(1.0, dop * dop * dop, 0.3);
  float grav = sqrt(1.0 - 1.0 / r);

  float t = clamp(pow(1.0 - x, 2.2) + (dop - 1.0) * 0.25, 0.0, 1.0);
  vec3 col = mix(vec3(0.62, 0.17, 0.04), vec3(1.0, 0.56, 0.2), smoothstep(0.0, 0.45, t));
  col = mix(col, vec3(1.0, 0.92, 0.8), smoothstep(0.45, 1.0, t));

  float I = edge * heat * dens * beam * grav * 4.0;
  float a = clamp(dens * edge * 1.6, 0.0, 0.96);
  return vec4(col * I, a) * on;
}

vec4 shade(vec4 g0, vec4 g1) {
  vec2 uv = screenUV();
  vec4 d0 = disk(g0.x, g0.y, g1.x);
  vec4 d1 = disk(g0.z, g0.w, g1.y);
  vec3 col = d0.rgb;
  float trans = 1.0 - d0.a;
  col += trans * d1.rgb;
  trans *= 1.0 - d1.a;
  float captured = g1.w < 0.0 ? 1.0 : 0.0;

  float vig = length(vec2(uv.x / ${ASPECT.toFixed(1)}, uv.y * 0.92));
  float edgeFade = 1.0 - smoothstep(0.62, 0.98, pow(pow(abs(uv.x / ${ASPECT.toFixed(1)}), 4.0) + pow(abs(uv.y), 4.0), 0.25));

  // photon ring at the critical impact parameter; flares on hover
  float b0 = length(cross(uCamPos, rayDir(uv)));
  float db = b0 - B_CRIT;
  float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
  float ring = exp(-db * db / 0.002) * (0.4 + uHover * (1.1 + 0.5 * pulse))
             + exp(-abs(db) / (0.2 + 0.25 * uHover)) * (0.08 + 0.35 * uHover);

  float hov = 1.0 + 0.5 * uHover;
  col += g1.z * 0.075 * hov * vec3(1.0, 0.62, 0.3);
  col += trans * ring * vec3(1.0, 0.82, 0.6);
  col += max(g1.w, 0.0) * vec3(0.82, 0.88, 1.0) * edgeFade;
  col += vec3(1.0, 0.6, 0.3) * (0.05 + 0.06 * uHover) * exp(-vig * 5.0);   // bloom around the core

  col = 1.0 - exp(-col * 1.25 * hov);
  col *= edgeFade * uFade;
  col += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;   // dither the haze
  col = max(col, 0.0);

  float occ = ((1.0 - trans) + captured * trans) * edgeFade * uFade;
  float a = clamp(max(occ, max(col.r, max(col.g, col.b))), 0.0, 1.0);
  return vec4(min(col, vec3(a)), a);
}
`;

const GEOMETRY_FRAG = `${HEAD}${COMMON}${TRACE}
layout(location = 0) out vec4 outG0;
layout(location = 1) out vec4 outG1;
void main() { trace(rayDir(screenUV()), outG0, outG1); }
`;

const SHADE_FRAG = `${HEAD}${COMMON}${SHADE}
uniform sampler2D uG0;
uniform sampler2D uG1;
out vec4 outColor;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  outColor = shade(texelFetch(uG0, p, 0), texelFetch(uG1, p, 0));
}
`;

const DIRECT_FRAG = `${HEAD}${COMMON}${TRACE}${SHADE}
out vec4 outColor;
void main() {
  vec4 g0, g1;
  trace(rayDir(screenUV()), g0, g1);
  outColor = shade(g0, g1);
}
`;

function cameraBasis() {
  const pos = [0, CAM_DIST * Math.sin(CAM_INCL), -CAM_DIST * Math.cos(CAM_INCL)];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const fwd = norm(pos.map((c) => -c));
  let right = norm(cross([0, 1, 0], fwd));
  let up = cross(fwd, right);
  const c = Math.cos(CAM_ROLL);
  const s = Math.sin(CAM_ROLL);
  [right, up] = [right.map((v, i) => v * c + up[i] * s), up.map((v, i) => v * c - right[i] * s)];
  return { pos, fwd, right, up };
}

export function createBlackHole(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const baked = !!gl.getExtension('EXT_color_buffer_float');
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

  const shaders = [];
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    shaders.push(sh);
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  // link without waiting — with KHR_parallel_shader_compile this happens off the main thread
  const link = (fragSrc) => {
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    return prog;
  };
  const progs = {
    noise: link(NOISE_FRAG),
    ...(baked ? { geometry: link(GEOMETRY_FRAG), shade: link(SHADE_FRAG) } : { direct: link(DIRECT_FRAG) }),
  };

  let state = 'compiling';    // -> 'ready' | 'failed'
  const linkedAt = performance.now();
  const uniforms = {};
  let noiseTex = null;
  let geo = null;             // baked geometry: { fbo, tex0, tex1 }
  let geoRow = 0;
  let width = 1;
  let height = 1;

  const fullscreen = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

  const finishLink = () => {
    for (const name of Object.keys(progs)) {
      if (!gl.getProgramParameter(progs[name], gl.LINK_STATUS)) {
        const log = shaders.map((s) => gl.getShaderInfoLog(s)).filter(Boolean).join('\n');
        console.warn('Black hole shader failed:', log || gl.getProgramInfoLog(progs[name]));
        state = 'failed';
        return;
      }
    }
    shaders.forEach((s) => gl.deleteShader(s));

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const cam = cameraBasis();
    for (const name of Object.keys(progs)) {
      const p = progs[name];
      const u = {};
      ['uRes', 'uTime', 'uFade', 'uHover', 'uNoise', 'uG0', 'uG1'].forEach((n) => {
        u[n] = gl.getUniformLocation(p, n);
      });
      uniforms[name] = u;
      gl.useProgram(p);
      gl.uniform3fv(gl.getUniformLocation(p, 'uCamPos'), cam.pos);
      gl.uniform3fv(gl.getUniformLocation(p, 'uCamRight'), cam.right);
      gl.uniform3fv(gl.getUniformLocation(p, 'uCamUp'), cam.up);
      gl.uniform3fv(gl.getUniformLocation(p, 'uCamFwd'), cam.fwd);
      gl.uniform1i(u.uNoise, 2);
      gl.uniform1i(u.uG0, 0);
      gl.uniform1i(u.uG1, 1);
    }

    // bake the noise texture once and mipmap it (mips = free anti-aliasing for the disk detail)
    noiseTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NOISE_SIZE, NOISE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTex, 0);
    gl.viewport(0, 0, NOISE_SIZE, NOISE_SIZE);
    gl.useProgram(progs.noise);
    fullscreen();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (aniso) {
      const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
    }
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.deleteProgram(progs.noise);
    delete progs.noise;

    state = 'ready';
  };

  const freeGeometry = () => {
    if (!geo) return;
    gl.deleteFramebuffer(geo.fbo);
    gl.deleteTexture(geo.tex0);
    gl.deleteTexture(geo.tex1);
    geo = null;
  };

  const allocGeometry = () => {
    freeGeometry();
    const makeTex = (unit, format) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return t;
    };
    // radius needs full float precision (fine disk detail); the rest is fine at half
    const tex0 = makeTex(0, gl.RGBA32F);
    const tex1 = makeTex(1, gl.RGBA16F);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex0, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, tex1, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    geo = { fbo, tex0, tex1 };
    geoRow = 0;
    if (!ok) {
      console.warn('Black hole: float render targets unsupported');
      state = 'failed';
    }
  };

  // trace a band of rows into the geometry textures; returns true once complete
  const bakeGeometry = (all) => {
    if (!geo) allocGeometry();
    if (state !== 'ready') return false;
    if (geoRow >= height) return true;
    const rows = all ? height : Math.max(8, Math.ceil(GEOMETRY_PX_PER_FRAME / width));
    gl.bindFramebuffer(gl.FRAMEBUFFER, geo.fbo);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, geoRow, width, rows);
    gl.useProgram(progs.geometry);
    gl.uniform2f(uniforms.geometry.uRes, width, height);
    fullscreen();
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    geoRow += rows;
    return geoRow >= height;
  };

  const draw = (time, fade, hover) => {
    const name = baked ? 'shade' : 'direct';
    const u = uniforms[name];
    gl.useProgram(progs[name]);
    if (baked) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, geo.tex0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, geo.tex1);
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.uRes, width, height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uFade, fade);
    gl.uniform1f(u.uHover, hover);
    fullscreen();
  };

  return {
    // true when the expensive geometry is precomputed (so full resolution is cheap)
    baked,
    setSize(w, h) {
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      if (geo) allocGeometry();
    },
    // Advance compile → noise → geometry bake, a little per frame. Returns true when drawable.
    // Pass all = true to finish the bake this frame (e.g. after a resize while visible).
    step(all = false) {
      if (gl.isContextLost()) return false;
      if (state === 'compiling') {
        // Without the extension, querying link status blocks until the GPU process finishes.
        // Browsers still compile in the background (e.g. Safari), so give it time before asking.
        const done = parallel
          ? Object.values(progs).every((p) => gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR))
          : performance.now() - linkedAt > 1500;
        if (!done) return false;
        finishLink();
      }
      if (state !== 'ready') return false;
      return baked ? bakeGeometry(all) : true;
    },
    failed() {
      return state === 'failed' || gl.isContextLost();
    },
    render(time, fade, hover) {
      if (state === 'ready' && (!baked || (geo && geoRow >= height))) draw(time, fade, hover);
    },
    dispose() {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    },
  };
}
