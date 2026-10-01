export const SHADER_IDS = [
  "micelio", "aurora", "liquid", "mesh", "halftone", "topo", "dither", "caustics", "iridescent",
] as const;
export type ShaderId = (typeof SHADER_IDS)[number];

export const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const HEADER = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * snoise(p); p = p * 2.02 + 17.0; a *= 0.5; }
  return v;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 grain(vec3 col, float amt) { return col + (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * amt; }
`;

/** Organic mycelium filaments over a domain-warped field. */
const micelio = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv += (u_mouse - 0.5) * 0.06;
  float t = u_time * 0.03;
  vec2 q = vec2(fbm(uv * 0.9 + t), fbm(uv * 0.9 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 1.2 + 2.5 * q + vec2(1.7, 9.2) + t), fbm(uv * 1.2 + 2.5 * q + vec2(8.3, 2.8)));
  float n = fbm(uv * 1.4 + 2.0 * r);
  // thin luminous hyphae: ridged noise kept sparse by a high exponent
  float f1 = pow(1.0 - abs(snoise(uv * 1.8 + 1.6 * r + t)), 40.0);
  float f2 = pow(1.0 - abs(snoise(uv * 3.6 + 1.2 * q - t)), 60.0);
  vec3 col = mix(u_c1, u_c2, smoothstep(-0.2, 0.9, n) * 0.85);
  float mask = smoothstep(-0.3, 0.7, n);
  col += u_c3 * (f1 * 0.7 + f2 * 0.35) * mask;
  col += u_c3 * 0.06 * smoothstep(0.4, 1.2, length(r));
  vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  col += u_c3 * (f1 + f2) * exp(-dot(uv - m, uv - m) * 5.0) * 0.6;
  col *= 1.0 - 0.5 * dot(uv * 0.8, uv * 0.8);
  gl_FragColor = vec4(grain(col, 0.03), 1.0);
}
`;

/** Soft aurora bands drifting across a dark sky. */
const aurora = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = u_time * 0.15;
  vec3 col = mix(u_c1, u_c1 * 0.4, uv.y);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float y = uv.y - 0.55 + fi * 0.06
      - 0.12 * sin(p.x * (1.5 + fi * 0.4) + t * (1.0 + fi * 0.3) + fi * 1.7)
      - 0.10 * snoise(vec2(p.x * 1.2 + t * 0.5, fi * 3.1 + t * 0.2))
      - (u_mouse.y - 0.5) * 0.12
      - (u_mouse.x - 0.5) * 0.15 * sin(p.x * 2.0 + fi);
    float w = 5.0 + fi * 2.5;
    float band = exp(-pow(y * w, 2.0));
    float rays = 0.6 + 0.4 * snoise(vec2(p.x * 18.0, t + fi));
    col += mix(u_c2, u_c3, fi / 3.0) * band * rays * 0.55;
  }
  col += u_c3 * 0.05 * smoothstep(0.995, 1.0, hash(floor(gl_FragCoord.xy / 2.0)));
  gl_FragColor = vec4(grain(col, 0.03), 1.0);
}
`;

/** Liquid chrome: iteratively warped sine field with specular bands. */
const liquid = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 p = uv * 2.2;
  float t = u_time * 0.25;
  for (int i = 1; i < 7; i++) {
    float fi = float(i);
    p.x += 0.35 / fi * sin(fi * 2.6 * p.y + t + u_mouse.x * 1.5);
    p.y += 0.35 / fi * cos(fi * 2.2 * p.x + t * 0.8 + u_mouse.y * 1.5);
  }
  float v = 0.5 + 0.5 * sin(p.x + p.y);
  float spec = pow(0.5 + 0.5 * cos(p.x * 2.0 - p.y * 1.3), 8.0);
  vec3 col = mix(u_c1, u_c2, smoothstep(0.0, 1.0, v));
  col = mix(col, u_c3, spec * 0.85);
  col += pow(spec, 6.0) * 0.25;
  col *= 1.0 - 0.3 * dot(uv, uv);
  gl_FragColor = vec4(grain(col, 0.03), 1.0);
}
`;

/** Slow mesh gradient of drifting colour blobs, heavy grain. */
const mesh = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.12;
  vec2 w = uv + 0.25 * vec2(snoise(uv * 1.2 + t), snoise(uv * 1.2 - t + 4.0));
  vec2 b1 = vec2(sin(t * 1.1) * 0.6, cos(t * 0.9) * 0.4);
  vec2 b2 = vec2(cos(t * 0.7 + 2.0) * 0.7, sin(t * 1.3 + 1.0) * 0.5);
  vec2 b3 = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0) * 0.8;
  vec3 col = u_c1;
  col = mix(col, u_c2, smoothstep(0.9, 0.0, length(w - b1)));
  col = mix(col, u_c3, smoothstep(0.75, 0.0, length(w - b2)) * 0.9);
  col = mix(col, mix(u_c2, u_c3, 0.5), smoothstep(0.6, 0.0, length(w - b3)) * 0.5);
  gl_FragColor = vec4(grain(col, 0.07), 1.0);
}
`;

/** Halftone dot grid modulated by flowing noise. */
const halftone = `
void main() {
  float cell = 9.0 * max(1.0, u_res.y / 900.0);
  vec2 g = floor(gl_FragCoord.xy / cell);
  vec2 f = fract(gl_FragCoord.xy / cell) - 0.5;
  vec2 uv = (g * cell - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.1;
  // Parallax: the whole field slides with the pointer / phone tilt, not just the highlight.
  vec2 shift = (u_mouse - 0.5) * 0.7;
  vec2 q = uv + shift;
  float n = fbm(q * 1.6 + vec2(t, -t * 0.6) + fbm(q * 2.0 - t) * 0.8);
  float m = length(uv - (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0));
  float v = clamp(n * 0.7 + 0.45 + smoothstep(0.6, 0.0, m) * 0.45, 0.0, 1.0);
  float r = v * 0.5;
  float d = smoothstep(r, r - 1.5 / cell, length(f));
  vec3 dotCol = mix(u_c2, u_c3, smoothstep(0.4, 0.9, v));
  vec3 col = mix(u_c1, dotCol, d);
  gl_FragColor = vec4(grain(col, 0.02), 1.0);
}
`;


/** Topographic contour lines; the pointer raises a hill under it. */
const topo = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  float t = u_time * 0.04;
  float h = fbm(uv * 1.0 + vec2(t, -t * 0.7)) * 0.8;
  h += 0.8 * exp(-dot(uv - m, uv - m) * 9.0);
  float lines = 13.0;
  float level = h * lines;
  float dist = abs(fract(level - 0.5) - 0.5) / max(fwidth(level), 1e-4);
  float major = step(mod(floor(level + 0.5), 5.0), 0.5);
  float line = 1.0 - smoothstep(0.5, 1.0 + major * 0.6, dist);
  vec3 col = mix(u_c1, u_c2, smoothstep(-0.6, 0.9, h) * 0.55);
  col += u_c3 * line * mix(0.32, 0.9, major);
  col *= 1.0 - 0.35 * dot(uv, uv);
  gl_FragColor = vec4(grain(col, 0.025), 1.0);
}
`;

/** 1-bit style ordered dithering of a moving light; the pointer is the lamp. */
const dither = `
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer8(vec2 a) {
  return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a);
}
void main() {
  float px = max(2.0, floor(u_res.y / 320.0));
  vec2 cell = floor(gl_FragCoord.xy / px);
  vec2 uv = (cell * px - 0.5 * u_res) / u_res.y;
  vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  float t = u_time * 0.08;
  float v = 0.5 + 0.5 * fbm(uv * 1.1 + vec2(t, t * 0.6));
  v = v * 0.55 + exp(-dot(uv - m, uv - m) * 2.5) * 0.65 - 0.12;
  float lv = floor(clamp(v, 0.0, 0.999) * 2.0 + bayer8(cell));
  vec3 col = lv < 0.5 ? u_c1 : (lv < 1.5 ? u_c2 : u_c3);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Underwater caustics from animated Voronoi edges; brightest near the pointer. */
const caustics = `
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float edges(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float f1 = 8.0, f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = 0.5 + 0.45 * sin(t + 6.2831 * hash2(i + g));
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  float t = u_time * 0.5;
  vec2 w = uv + 0.08 * vec2(snoise(uv * 2.0 + t * 0.2), snoise(uv * 2.0 - t * 0.2));
  float a = 1.0 - smoothstep(0.0, 0.09, edges(w * 3.5 + m * 0.4, t));
  float b = 1.0 - smoothstep(0.0, 0.07, edges(w * 6.0 - m * 0.6 + 3.1, t * 1.3));
  float light = 0.55 + 0.9 * exp(-dot(uv - m, uv - m) * 2.0);
  vec3 col = mix(u_c1, u_c2, smoothstep(-0.6, 0.7, uv.y + 0.2 * snoise(uv + t * 0.1)));
  col += u_c3 * (a * 0.7 + b * 0.35) * light;
  gl_FragColor = vec4(grain(col, 0.025), 1.0);
}
`;

/** Oil-slick thin-film bands; the pointer rotates the light and shifts the film thickness. */
const iridescent = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  float t = u_time * 0.05;
  float ang = (u_mouse.x - 0.5) * 3.0 + 0.7;
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 w = uv + 0.35 * vec2(fbm(uv * 1.1 + t), fbm(uv * 1.1 - t + 5.0));
  float h = dot(w, dir) * 2.2 + (u_mouse.y - 0.5) * 1.5;
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));
  vec3 tint = mix(u_c2, u_c3, film.g) * 0.75 + film * 0.35;
  float slick = smoothstep(-0.35, 0.45, fbm(w * 0.9 - t * 0.7));
  vec3 col = mix(u_c1, tint, slick * 0.9);
  col += u_c3 * 0.35 * exp(-dot(uv - m, uv - m) * 6.0);
  col *= 1.0 - 0.3 * dot(uv, uv);
  gl_FragColor = vec4(grain(col, 0.03), 1.0);
}
`;

/** fwidth() needs this extension in WebGL1; ShaderCanvas enables it before compiling. */
const DERIVATIVES = "#extension GL_OES_standard_derivatives : enable\n";

export const SHADERS: Record<ShaderId, { label: string; frag: string; palette: [string, string, string] }> = {
  micelio: { label: "Micelio", frag: HEADER + micelio, palette: ["#07060b", "#3b1d5e", "#c9a7ff"] },
  aurora: { label: "Aurora", frag: HEADER + aurora, palette: ["#030712", "#14b8a6", "#a78bfa"] },
  liquid: { label: "Cromo líquido", frag: HEADER + liquid, palette: ["#0b0b0f", "#5b5f6b", "#e8ecf4"] },
  mesh: { label: "Gradiente", frag: HEADER + mesh, palette: ["#120a1f", "#ff5e3a", "#ffc2e2"] },
  halftone: { label: "Halftone", frag: HEADER + halftone, palette: ["#0a0a0a", "#2b2b2b", "#d4ff3a"] },
  topo: { label: "Topografía", frag: DERIVATIVES + HEADER + topo, palette: ["#0b0d0c", "#1d2b24", "#9ff2c7"] },
  dither: { label: "Dither", frag: HEADER + dither, palette: ["#0c0b10", "#3a2f6b", "#ff8a5c"] },
  caustics: { label: "Cáusticas", frag: HEADER + caustics, palette: ["#031018", "#0b3a4a", "#9be7ff"] },
  iridescent: { label: "Iridiscente", frag: HEADER + iridescent, palette: ["#08080c", "#ff7ad9", "#6ee7ff"] },
};
