import { useEffect, useRef } from 'react';
import './Aurora.css';

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAmplitude;
uniform float uBlend;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1  = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x2 = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x2) - 0.5;
  vec3 ox = floor(x2 + 0.5);
  vec3 a0 = x2 - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  uv.x *= uResolution.x / uResolution.y;

  float n1 = snoise(vec2(uv.x*1.5 + uTime*0.15, uv.y*1.0 + uTime*0.08)) * uAmplitude;
  float n2 = snoise(vec2(uv.x*0.8 - uTime*0.10, uv.y*1.2 + uTime*0.12)) * uAmplitude;
  float n3 = snoise(vec2(uv.x*2.0 + uTime*0.05, uv.y*0.5 - uTime*0.10)) * uAmplitude * 0.5;

  float b1 = smoothstep(0.0, 0.5, vUv.x);
  float b2 = smoothstep(0.5, 1.0, vUv.x);

  vec3 color = mix(uColor1, uColor2, clamp(b1 + n1*0.3, 0.0, 1.0));
  color = mix(color, uColor3, clamp(b2 + n2*0.3, 0.0, 1.0));

  float alpha = smoothstep(0.0, uBlend, vUv.y) * smoothstep(1.0, 1.0-uBlend, vUv.y);
  alpha *= (0.4 + 0.3*(n1+n2+n3));
  alpha = clamp(alpha, 0.0, 0.65);

  gl_FragColor = vec4(color, alpha);
}`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error('Shader error:', gl.getShaderInfoLog(s));
  return s;
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1,3),16)/255,
    parseInt(hex.slice(3,5),16)/255,
    parseInt(hex.slice(5,7),16)/255,
  ];
}

export default function Aurora({
  colorStops = ['#0d3b66', '#00b4d8', '#0d3b66'],
  amplitude = 1.0,
  blend = 0.4,
  speed = 0.5,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Compile & link program
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full-screen triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTime       = gl.getUniformLocation(prog, 'uTime');
    const uAmplitude  = gl.getUniformLocation(prog, 'uAmplitude');
    const uBlend      = gl.getUniformLocation(prog, 'uBlend');
    const uResolution = gl.getUniformLocation(prog, 'uResolution');
    const uColor1     = gl.getUniformLocation(prog, 'uColor1');
    const uColor2     = gl.getUniformLocation(prog, 'uColor2');
    const uColor3     = gl.getUniformLocation(prog, 'uColor3');

    gl.uniform1f(uAmplitude, amplitude);
    gl.uniform1f(uBlend, blend);
    gl.uniform3fv(uColor1, hexToRgb(colorStops[0]));
    gl.uniform3fv(uColor2, hexToRgb(colorStops[1]));
    gl.uniform3fv(uColor3, hexToRgb(colorStops[2] ?? colorStops[0]));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    let raf;
    const start = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - start) / 1000 * speed;
      gl.uniform1f(uTime, t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buf);
    };
  }, [colorStops, amplitude, blend, speed]);

  return <canvas ref={canvasRef} className="aurora-canvas" />;
}
