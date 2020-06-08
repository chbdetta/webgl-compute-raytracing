import Renderer from "./renderer";
import { worlds } from "./world";

let WIDTH = 1200;
let HEIGHT = 800;

function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  let renderer: Renderer;

  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  try {
    renderer = new Renderer(canvas, WIDTH, HEIGHT);
  } catch {
    const p = document.createElement("h1");
    p.innerHTML = `You need to use Google Chrome Browser (>= v80) and turn on these experimental features in <i>chrome://flags</i> <br> WebGL 2.0 Compute: Enabled <br> Choose ANGLE graphics backend: OpenGL`;
    canvas.remove();
    document.body.append(p);
    return;
  }

  renderer.world = worlds.test;
  renderer.world.camera.setRatio(WIDTH / HEIGHT);

  document.getElementById(
    "resolution"
  )!.innerText = `${renderer.width} x ${renderer.height}`;

  const tick = () => {
    renderer.render();

    document.getElementById("rays")!.innerText = String(
      renderer.stats.rayCount
    );

    document.getElementById("fps")!.innerText = renderer.stats.fps.toFixed(2);

    requestAnimationFrame(tick);
  };

  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement == canvas) {
      renderer.world?.camera.pan(e.movementX, e.movementY);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (document.pointerLockElement == canvas) {
      switch (e.key) {
        case "w":
          renderer.world?.camera.forward();
          break;
        case "s":
          renderer.world?.camera.backward();
          break;
        case "a":
          renderer.world?.camera.left();
          break;
        case "d":
          renderer.world?.camera.right();
          break;
      }
    }
  });

  tick();
}

window.onload = main;
