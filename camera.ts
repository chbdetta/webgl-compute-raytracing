import { vec3, mat4 } from "gl-matrix";
import EventEmitter from "eventemitter3";

enum Event {
  CHANGE = "change",
}

type CameraJSON = {
  ratio: number;
  eye: vec3;
  at: vec3;
  up: vec3;
  fov: number;
};

export default class Camera extends EventEmitter {
  // events
  static CHANGE = Event.CHANGE;

  eye: vec3;
  at: vec3;
  up: vec3;

  ratio: number;
  fov: number;
  // moving speed
  private speed = 0.1;
  private mouseSensitivity = 0.05;
  #panMatrix: mat4;

  invertPerspective: mat4;
  invertView: mat4;
  #NDCToScreen: mat4;

  // direction
  private get dir() {
    const dir = vec3.clone(this.at);
    vec3.sub(dir, dir, this.eye);
    vec3.normalize(dir, dir);

    return dir;
  }

  private get side() {
    const dir = vec3.clone(this.dir);
    return vec3.cross(dir, dir, vec3.normalize(vec3.create(), this.up));
  }

  constructor({
    ratio,
    eye,
    at,
    up,
    fov,
  }: {
    ratio: number;
    eye?: vec3;
    at?: vec3;
    up?: vec3;
    fov?: number;
  }) {
    super();

    this.eye = eye || vec3.clone([0, 0, -3]);
    this.at = at || vec3.clone([0, 0, 0]);
    this.up = up || vec3.clone([0, 1, 0]);
    this.ratio = ratio;
    this.fov = fov ?? Math.PI / 4;
    this.#NDCToScreen = mat4.create();
    this.#panMatrix = mat4.create();

    mat4.identity(this.#NDCToScreen);
    mat4.translate(this.#NDCToScreen, this.#NDCToScreen, [-1, -1, 0]);
    mat4.scale(this.#NDCToScreen, this.#NDCToScreen, [2, 2, 1]);

    this.invertView = mat4.create();
    this.invertPerspective = mat4.create();
    this.update();
  }

  update() {
    mat4.lookAt(this.invertView, this.eye, this.at, this.up);
    mat4.invert(this.invertView, this.invertView);

    mat4.perspective(this.invertPerspective, this.fov, this.ratio, 0.1, 1000);
    mat4.invert(this.invertPerspective, this.invertPerspective);

    mat4.multiply(
      this.invertPerspective,
      this.invertPerspective,
      this.#NDCToScreen
    );

    this.emit(Camera.CHANGE, this.json(), this);
  }

  json(): CameraJSON {
    return {
      ratio: this.ratio,
      eye: this.eye,
      at: this.at,
      up: this.up,
      fov: this.fov,
    };
  }

  parse(data: CameraJSON) {
    this.ratio = data.ratio;
    this.eye = data.eye;
    this.at = data.at;
    this.up = data.up;
    this.fov = data.fov;

    this.update();
  }

  setRatio(ratio: number) {
    this.ratio = ratio;
    this.update();
  }

  setEye(eye: vec3) {
    this.eye = eye;
    this.update();
  }

  setAt(at: vec3) {
    this.at = at;
    this.update();
  }

  setInvertProjection(matrix: mat4) {
    this.invertPerspective = matrix;
    this.update();
  }

  walkForward() {
    const step: vec3 = [this.dir[0], 0, this.dir[2]];
    vec3.scale(step, step, this.speed);

    vec3.add(this.eye, this.eye, step);
    vec3.add(this.at, this.at, step);

    this.update();
  }

  walkBackward() {
    const step: vec3 = [this.dir[0], 0, this.dir[2]];
    vec3.scale(step, step, -this.speed);

    vec3.add(this.eye, this.eye, step);
    vec3.add(this.at, this.at, step);

    this.update();
  }

  walkRight = this.right;

  walkLeft = this.left;

  forward() {
    const dir = this.dir;
    const step = vec3.scale(dir, dir, this.speed);
    this.move(step);
  }

  backward() {
    const dir = this.dir;
    const step = vec3.scale(dir, dir, -this.speed);
    this.move(step);
  }

  left() {
    const side = this.side;
    const step = vec3.scale(side, side, -this.speed);
    this.move(step);
  }

  right() {
    const side = this.side;
    const step = vec3.scale(side, side, this.speed);
    this.move(step);
  }

  move(step: vec3) {
    vec3.add(this.eye, this.eye, step);
    vec3.add(this.at, this.at, step);

    this.update();
  }

  pan(x: number, y: number) {
    mat4.identity(this.#panMatrix);
    mat4.rotate(
      this.#panMatrix,
      this.#panMatrix,
      -((x * this.mouseSensitivity) / 180) * Math.PI,
      this.up
    );
    mat4.rotate(
      this.#panMatrix,
      this.#panMatrix,
      -((y * this.mouseSensitivity) / 180) * Math.PI,
      this.side
    );

    const dir = this.dir;
    vec3.transformMat4(dir, dir, this.#panMatrix);
    vec3.add(this.at, this.eye, dir);
    this.update();
  }
}
