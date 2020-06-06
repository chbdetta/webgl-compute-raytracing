import { mat4, vec2, vec3 } from "gl-matrix";

export interface PointData {
  uv: vec2;
  normal: vec3;
  location: vec3;
}

const DEFAULT_UV = vec2.clone([0, 0]);

/**
 * A point in 3D space, with its normal vector
 */
class Point {
  normal: vec3;
  location: vec3;

  constructor(location: vec3, normal: vec3 = [0, 0, 0]) {
    this.location = location;
    this.normal = normal;
  }

  mergeNormal(normal: vec3) {
    vec3.add(this.normal, this.normal, normal);
    vec3.normalize(this.normal, this.normal);
  }

  transformNormal(mat: mat4) {
    vec3.normalize(
      this.normal,
      vec3.transformMat4(this.normal, this.normal, mat)
    );
  }

  transform(mat: mat4) {
    const invTransMat = mat4.create();
    mat4.invert(invTransMat, mat);
    mat4.transpose(invTransMat, invTransMat);

    vec3.transformMat4(this.location, this.location, mat);
    this.transformNormal(invTransMat);
  }

  clone() {
    return new Point(vec3.clone(this.location), vec3.clone(this.normal));
  }
}

export class Face {
  private points: [Point, Point, Point];
  private uvs: [vec2, vec2, vec2];
  private normal: vec3;
  private faceNormal: boolean;

  static pointCount = 3;

  constructor(p1: Point, p2: Point, p3: Point, faceNormal?: boolean);
  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    u1: vec2,
    u2: vec2,
    u3: vec2,
    faceNormal?: boolean
  );
  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    u1: vec2 | boolean = DEFAULT_UV,
    u2: vec2 = DEFAULT_UV,
    u3: vec2 = DEFAULT_UV,
    faceNormal = false
  ) {
    if (arguments.length === 4) {
      faceNormal = typeof u1 === "boolean" ? u1 : false;
      u1 = DEFAULT_UV;
    }

    this.points = [p1, p2, p3];
    this.uvs = [u1 as vec2, u2, u3];
    this.normal = vec3.cross(
      vec3.create(),
      vec3.sub(vec3.create(), p2.location, p1.location),
      vec3.sub(vec3.create(), p3.location, p1.location)
    );
    vec3.normalize(this.normal, this.normal);

    if (!faceNormal) {
      for (const p of this.points) {
        p.mergeNormal(this.normal);
      }
    }

    this.faceNormal = faceNormal;
  }

  point(i: number): PointData {
    const p = this.points[i];
    return {
      location: p.location,
      uv: this.uvs[i],
      normal: this.faceNormal ? this.normal : p.normal,
    };
  }

  transformNormal(mat: mat4) {
    vec3.transformMat4(this.normal, this.normal, mat);
    vec3.normalize(this.normal, this.normal);
  }

  clone(pf: PointFactory) {
    const newPoints = this.points.map(({ location }) =>
      pf.get(location[0], location[1], location[2])
    ) as [Point, Point, Point];

    return new Face(
      newPoints[0],
      newPoints[1],
      newPoints[2],
      this.uvs[0],
      this.uvs[1],
      this.uvs[2],
      this.faceNormal
    );
  }

  *[Symbol.iterator]() {
    yield this.point(0);
    yield this.point(1);
    yield this.point(2);
  }

  get p1() {
    return this.point(0);
  }
  get p2() {
    return this.point(1);
  }
  get p3() {
    return this.point(2);
  }
}

class ThreeDFactory<T> {
  items: T[] = [];
  itemMap: Map<number, Map<number, Map<number, number>>> = new Map();
  factory: (a: vec3) => T;

  constructor(factory: (a: vec3) => T) {
    this.factory = factory;
  }

  has(x: number, y: number, z: number) {
    return !!this.itemMap.get(x)?.get(y)?.get(z);
  }

  get(x: number, y: number, z: number) {
    let ymap = this.itemMap.get(x);
    if (!ymap) {
      ymap = new Map();
      this.itemMap.set(x, ymap);
    }

    let zmap = ymap.get(y);

    if (!zmap) {
      zmap = new Map();
      ymap.set(y, zmap);
    }

    const index = zmap.get(z);
    let item;

    if (index == null) {
      item = this.factory([x, y, z]);
      this.items.push(item);
      zmap.set(z, this.items.length - 1);
    } else {
      item = this.items[index];
    }

    return item;
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  get length() {
    return this.items.length;
  }
}

class TwoDFactory<T> {
  itemMap: Map<number, Map<number, number>> = new Map();
  items: T[] = [];
  private factory: (a: [number, number]) => T;

  constructor(type: (a: [number, number]) => T) {
    this.factory = type;
  }

  get(x: number, y: number) {
    let ymap = this.itemMap.get(x);
    if (!ymap) {
      ymap = new Map();
      this.itemMap.set(x, ymap);
    }

    const index = ymap.get(y);
    let item;

    if (index == null) {
      item = this.factory([x, y]);
      this.items.push(item);
      ymap.set(y, this.items.length - 1);
    } else {
      item = this.items[index];
    }

    return item;
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  get length() {
    return this.items.length;
  }
}

export class PointFactory extends ThreeDFactory<Point> {
  constructor() {
    super((...rest) => new Point(...rest));
  }
}

export class UVFactory extends TwoDFactory<vec2> {
  constructor() {
    super((...rest) => vec2.clone(...rest));
  }
}
