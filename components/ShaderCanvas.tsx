"use client";

import { useEffect, useRef } from "react";
import { SHADERS, VERTEX, type ShaderId } from "@/lib/shaders";

type Props = {
  shader: ShaderId;
  colors: [string, string, string];
  speed?: number;
  className?: string;
};

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

export default function ShaderCanvas({ shader, colors, speed = 1, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Live values read inside the render loop without restarting it.
  const live = useRef({ colors, speed });
  const repaint = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, SHADERS[shader].frag));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("u_res"), uTime = u("u_time"), uMouse = u("u_mouse");
    const uC = [u("u_c1"), u("u_c2"), u("u_c3")];

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let time = 7.3;
    let last = performance.now();
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt * live.current.speed;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      live.current.colors.forEach((c, i) => gl.uniform3fv(uC[i], hexToRgb(c)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    repaint.current = () => {
      if (reduced) requestAnimationFrame(draw);
    };
    const ro = new ResizeObserver(() => repaint.current());
    ro.observe(canvas);

    window.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, [shader]);

  // Reduced-motion users get a static frame; repaint it when colours change.
  useEffect(() => {
    live.current = { colors, speed };
    repaint.current();
  }, [colors, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ background: colors[0] }}
    />
  );
}
