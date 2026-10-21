/** Snapshot the map, then twist its pixels around the center for two seconds. */
export async function playBattleTransition(game, host) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rect = host.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.className = "battle-transition";
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(1280, Math.round(rect.width * devicePixelRatio));
  canvas.height = Math.round(canvas.width * rect.height / rect.width);
  overlay.append(canvas); document.body.append(overlay);
  let image;
  try {
    image = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 900);
      game.renderer.snapshot((snapshot) => { clearTimeout(timeout); resolve(snapshot); });
    });
  } catch { image = null; }
  let render;
  const gl = !reduced && image ? canvas.getContext("webgl", { alpha: false, antialias: false }) : null;
  if (gl) {
    try {
      const compile = (type, source) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Transition shader unavailable");
        return shader;
      };
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, "attribute vec2 a; varying vec2 uv; void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}"));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `precision mediump float;
        varying vec2 uv; uniform sampler2D img; uniform float progress; uniform vec2 size;
        void main(){
          float aspect=size.x/size.y;
          vec2 p=(uv-.5)*vec2(aspect,1.);
          float angle=progress*1.256637*(1.-smoothstep(0.,.9,length(p)));
          float c=cos(angle),s=sin(angle);
          p=mat2(c,-s,s,c)*p/(1.+progress*.12);
          vec2 q=p/vec2(aspect,1.)+.5;
          vec2 blur=vec2(progress*6.)/size;
          vec4 col=texture2D(img,q)*.24;
          col+=texture2D(img,q+vec2(blur.x,0.))*.12;
          col+=texture2D(img,q-vec2(blur.x,0.))*.12;
          col+=texture2D(img,q+vec2(0.,blur.y))*.12;
          col+=texture2D(img,q-vec2(0.,blur.y))*.12;
          col+=texture2D(img,q+blur)*.07; col+=texture2D(img,q-blur)*.07;
          col+=texture2D(img,q+vec2(blur.x,-blur.y))*.07;
          col+=texture2D(img,q+vec2(-blur.x,blur.y))*.07;
          gl_FragColor=vec4(col.rgb*(1.-smoothstep(.74,1.,progress)),1.);
        }`));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Transition link failed");
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const attribute = gl.getAttribLocation(program,"a"); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
      const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform2f(gl.getUniformLocation(program,"size"),canvas.width,canvas.height);
      const progress = gl.getUniformLocation(program,"progress");
      gl.viewport(0,0,canvas.width,canvas.height);
      render = (p) => { gl.uniform1f(progress,p); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
    } catch { render = null; }
  }
  if (!render) {
    canvas.remove();
    if (image) { overlay.style.backgroundImage = `url("${image.src}")`; overlay.style.backgroundSize = "100% 100%"; }
    render = (p) => { overlay.style.filter = reduced ? "none" : `blur(${p * 7}px)`; overlay.style.boxShadow = `inset 0 0 0 100vmax rgba(4,8,7,${p})`; };
  }
  await new Promise((resolve) => {
    const started = performance.now(), duration = reduced ? 220 : 2000;
    const tick = (now) => {
      const p = Math.min(1,(now-started)/duration); render(p*p*(3-2*p));
      if (p<1) requestAnimationFrame(tick); else resolve();
    }; requestAnimationFrame(tick);
  });
  return () => { overlay.remove(); gl?.getExtension("WEBGL_lose_context")?.loseContext(); };
}
