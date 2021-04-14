import "./index.scss";
import ResizeObserver from "resize-observer-polyfill";
import opentype from "opentype.js";
import { Renderer } from "./renderer";
import PingFang from "./assets/fonts/PingFang.ttf";
import { fromEvent } from "rxjs";
import { switchMap, takeUntil, throttleTime } from "rxjs/operators";

const container = document.querySelector("#app-root")! as HTMLDivElement;
const canvas = document.createElement("canvas") as HTMLCanvasElement;
container.append(canvas);

const mousedown$ = fromEvent<MouseEvent>(canvas, "mousedown");
const mousemove$ = fromEvent<MouseEvent>(canvas, "mousemove");
const mouseup$ = fromEvent<MouseEvent>(canvas, "mouseup");
const wheel$ = fromEvent<WheelEvent>(canvas, "wheel");

export let transform = { x: 0, y: 0, z: 1 };
let startPos = { x: 0, y: 0 };

mousedown$
  .pipe(
    switchMap(({ x, y }) => {
      startPos.x = x - transform.x;
      startPos.y = y - transform.y;
      return mousemove$.pipe(throttleTime(16.7), takeUntil(mouseup$));
    })
  )
  .subscribe(({ x, y }) => {
    transform.x = x - startPos.x;
    transform.y = y - startPos.y;
  });

wheel$.pipe(throttleTime(16.7)).subscribe((event) => {
  event.preventDefault();

  if (event.ctrlKey) {
    const { x, y } = event;

    const pos = {
      x: (x - transform.x) / transform.z,
      y: (y - transform.y) / transform.z,
    };

    transform.z *= 1 - event.deltaY / 20;

    transform.x = x - pos.x * transform.z;
    transform.y = y - pos.y * transform.z;

    console.log(transform.z);
  } else {
    transform.x -= event.deltaX;
    transform.y -= event.deltaY;
  }
});

const resizeObserver = new ResizeObserver((elements: ResizeObserverEntry[]) => {
  elements.forEach(({ contentRect: { width, height } }) => {
    const dpr = window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  });
});
resizeObserver.observe(container);

const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
const renderer = new Renderer(gl);

function parsePath(path: opentype.Path) {
  const boundingBox = path.getBoundingBox();
  const positions = [boundingBox.x1, boundingBox.y1];
  const indices = [0];
  let startIndex = 0;
  const quadPositions: number[] = [];

  path.commands.forEach((cmd) => {
    let index = positions.length / 2;
    switch (cmd.type) {
      case "Z": {
        indices.push(startIndex);
        indices.push(0xffff);
        indices.push(startIndex);
        startIndex = index;
        break;
      }
      case "Q": {
        quadPositions.push(positions[positions.length - 2]);
        quadPositions.push(positions[positions.length - 1]);
        quadPositions.push(cmd.x1);
        quadPositions.push(cmd.y1);
        quadPositions.push(cmd.x);
        quadPositions.push(cmd.y);
        // continue go to default
      }
      default: {
        positions.push(cmd.x);
        positions.push(cmd.y);
        indices.push(index);
      }
    }
  });

  const quadIndices = new Array(quadPositions.length / 2);
  const barycentric = new Array(quadPositions.length);
  for (let i = 0; i < quadPositions.length / 2; i++) {
    quadIndices[i] = i;
    barycentric[i * 2] = i % 3 == 0 ? 1.0 : 0.0;
    barycentric[i * 2 + 1] = i % 3 == 1 ? 1.0 : 0.0;
  }

  return {
    positions,
    indices,
    quadPositions,
    quadIndices,
    barycentric,
    boundingBox,
  };
}

opentype.load(PingFang, (err, font) => {
  if (err || !font) return;

  const path = font.getPath("你好", 0, 72 * 1, 72);
  const pathInfo = parsePath(path);

  (function tick() {
    requestAnimationFrame(tick);

    const { width, height } = canvas;

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderer.render(pathInfo);
  })();
});
