import { mat4, vec3 } from "gl-matrix";
import { Face, PointFactory } from "../../point";
import RenderObject, { RenderCallback } from "./render";
import Material from "../material";
import { Slab } from "./bounding-box";
import {
  Buffers,
  MeshBuffer,
  VertexBuffer,
  SlabBuffer,
  BuffersLength,
} from "../buffer";

/**
 * We make some assumptions to improve the performance
 * 1. The vertices number of a shape is invariant.
 * 2. The
 */
export default class Primitive extends RenderObject {
  // The point coordinate information
  // It contains location vertices and uv coordinates
  data: Float32Array;
  // The id of a texture
  faces: Readonly<Face[]>;
  rawPoints: PointFactory;
  bbox: Slab[] = [];

  constructor(name: string, faces: Readonly<Face[]>, pf: PointFactory) {
    super(name);

    this.faces = faces;
    this.rawPoints = pf;
  }

  invertNormal(): this {
    const mat = mat4.create();
    mat4.scale(mat, mat, [-1, -1, -1]);

    if (this.rawPoints && this.faces) {
      for (const point of this.rawPoints) {
        point.transformNormal(mat);
      }

      for (const face of this.faces) {
        face.transformNormal(mat);
      }
    } else {
      console.warn("Modifying the object after freezing");
    }

    return this;
  }

  clone(preserveModelMatrix = false): Primitive {
    if (!this.faces) {
      console.warn("Modifying the object after freezing");
      return this;
    }

    // The faces array can not be shared because they are modified in commit()
    const pf = new PointFactory();
    const faces = this.faces.map((face) => face.clone(pf));

    const s = new Primitive(this.name, faces, pf);
    s.animateMatrix = this.animateMatrix;
    // We don't clone the model matrix by default so the cloning behavior is more
    // predictable.
    if (preserveModelMatrix) {
      s.modelMatrix = mat4.clone(this.modelMatrix);
    }

    s.material = this.material;

    return s;
  }

  /**
   * Transform the object from the object space into the world space.
   */
  commit(): this {
    if (!this.faces || !this.rawPoints) {
      console.warn("Modifying the object after freezing");
      return this;
    }

    for (const point of this.rawPoints) {
      point.transform(this.modelMatrix);
    }

    mat4.invert(this.modelMatrix, this.modelMatrix);
    mat4.transpose(this.modelMatrix, this.modelMatrix);

    for (const face of this.faces) {
      face.transformNormal(this.modelMatrix);
    }

    mat4.identity(this.modelMatrix);
    return this;
  }

  createBoundingBox(): void {
    const v = Math.sqrt(3) / 3;

    const normals: vec3[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [v, v, v],
      [-v, v, v],
      [-v, -v, v],
      [v, -v, v],
    ];
    // generate the bounding box
    this.bbox = normals.map((n) => new Slab(this, n));
  }

  freeze(): void {
    if (!this.faces || !this.rawPoints) {
      console.warn("Modifying the object after freezing");
      return;
    }

    // convert to world space
    this.commit();

    this.createBoundingBox();
  }

  bufferCount(): BuffersLength {
    // we need to freeze before getting the buffer length
    this.freeze();

    return {
      vertex: this.faces.length * Face.pointCount * VertexBuffer.bytes,
      mesh: MeshBuffer.bytes,
      slab: this.bbox.reduce(
        (acc, slab) => (slab.bufferCount().slab ?? 0) + acc,
        0
      ),
    };
  }

  bufferAppend(buffer: Buffers): void {
    buffer.mesh.append({
      faceCount: this.faces.length,
      vertexOffset: buffer.vertex.cursor / VertexBuffer.bytes,
      slabCount: this.bbox.length,
      slabOffset: buffer.slab.cursor / SlabBuffer.bytes,
      // we know BaseMaterial would be merged into here, so they are always available
      specularExponent: this.material.specularExponent!,
      specularColor: this.material.specular!,
      diffuseColor: this.material.color!,
      refractionColor: this.material.refraction!,
    });

    for (const face of this.faces) {
      for (const p of face) {
        buffer.vertex.append(p.location);
      }
    }

    for (const slab of this.bbox) {
      buffer.slab.append(slab);
    }
  }

  render(cb: RenderCallback, material: Material, time: number): void;
  render(
    cb: RenderCallback,
    material: Material,
    matrix: mat4,
    time: number
  ): void;
  render(
    cb: RenderCallback,
    material: Material,
    matrix: mat4 | number,
    time?: number
  ): void {
    let modelMatrix: mat4 | undefined = matrix as unknown as mat4;

    if (arguments.length === 3) {
      time = matrix as number;
      modelMatrix = void 0;
    }

    if (this.animateMatrix) {
      this.animateMatrix(time as number, this);
    }

    const isCascade = !!modelMatrix;

    if (isCascade && modelMatrix) {
      mat4.multiply(modelMatrix, modelMatrix, this.modelMatrix);
    } else {
      modelMatrix = this.modelMatrix;
    }

    cb(this.data, this.material.merge(material), modelMatrix);

    if (isCascade) {
      mat4.invert(this.modelMatrix, this.modelMatrix);
      mat4.multiply(modelMatrix, modelMatrix, this.modelMatrix);
      mat4.invert(this.modelMatrix, this.modelMatrix);
    }
  }
}
