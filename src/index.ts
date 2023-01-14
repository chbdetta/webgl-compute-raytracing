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
  } catch (e) {
    const p = document.createElement("h1");
    p.innerHTML = `You need to use Google Chrome Browser (>= v80) and turn on these experimental features in <i>chrome://flags</i> <br> WebGL 2.0 Compute: Enabled <br> Choose ANGLE graphics backend: OpenGL`;
    canvas.remove();
    document.body.append(p);
    console.log(e);
    return;
  }

  const tick = () => {
    renderer.render();

    document.getElementById("main-rays")!.innerText = String(
      renderer.stats.mainRay
    );

    document.getElementById("rays")!.innerText = String(
      renderer.stats.rayCount
    );

    document.getElementById("ray-test")!.innerText = String(
      renderer.stats.rayTest
    );

    document.getElementById("ray-intersect")!.innerText = String(
      renderer.stats.rayIntersection
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

  window.addEventListener("resize", () => {
    renderer.width = window.innerWidth;
    renderer.height = window.innerHeight;
    renderer.world?.camera.setRatio(renderer.width / renderer.height);
  });

  const worldSelector = document.getElementById(
    "world-selector"
  )! as HTMLSelectElement;

  worlds.forEach(({ name }, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.innerText = name;
    worldSelector.appendChild(option);
  });

  document
    .getElementById("world-selector")
    ?.addEventListener("change", function () {
      const worldIndex = ~~(this as HTMLSelectElement).value;
      renderer.world = worlds[worldIndex];

      localStorage.setItem("world", renderer.world.name);
    });

  if (localStorage.getItem("world")) {
    const index = worlds.findIndex(
      ({ name }) => name === localStorage.getItem("world")
    );
    worldSelector.value = String(index);
  } else {
    worldSelector.value = "0";
  }
  worldSelector.dispatchEvent(new InputEvent("change"));

  document.getElementById("reset")?.addEventListener("click", () => {
    renderer.world?.camera.reset();
  });

  tick();
}

window.onload = main;
