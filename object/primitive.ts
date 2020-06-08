import { mat4 } from "gl-matrix";
import { Face, PointFactory } from "../point";
import RenderObject, { RenderCallback } from "./render";
import Material from "../material";
import { BoundingBox } from "./bouding-box";

const meshBytes = 28;

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
  bbox: BoundingBox | null;

  constructor(name: string, faces: Readonly<Face[]>, pf: PointFactory) {
    super(name);

    this.faces = faces;
    this.rawPoints = pf;
    this.bbox = null;
  }

  invertNormal() {
    const mat = mat4.create();
    mat4.scale(mat, mat, [-1, -1, -1]);

    if (this.rawPoints && this.faces) {
      for (let point of this.rawPoints) {
        point.transformNormal(mat);
      }

      for (let face of this.faces) {
        face.transformNormal(mat);
      }
    } else {
      console.warn("Modifying the object after freezing");
    }

    return this;
  }

  clone(preserveModelMatrix = false) {
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
  commit() {
    if (!this.faces || !this.rawPoints) {
      console.warn("Modifying the object after freezing");
      return this;
    }

    for (let point of this.rawPoints) {
      point.transform(this.modelMatrix);
    }

    mat4.invert(this.modelMatrix, this.modelMatrix);
    mat4.transpose(this.modelMatrix, this.modelMatrix);

    for (let face of this.faces) {
      face.transformNormal(this.modelMatrix);
    }

    mat4.identity(this.modelMatrix);
    return this;
  }

  freeze(material: Material) {
    if (!this.faces || !this.rawPoints) {
      console.warn("Modifying the object after freezing");
      return [0, 1] as [number, number];
    }

    // generate the bounding box
    this.bbox = new BoundingBox(this);

    const size = 4;
    const data = (this.data = new Float32Array(
      this.faces.length * Face.pointCount * size
    ));

    super.freeze(material);

    for (const [i, face] of this.faces.entries()) {
      for (let j = 0; j < 3; j++) {
        let ii = (i * Face.pointCount + j) * size;

        const p = face.point(j);
        // location
        data[ii++] = p.location[0];
        data[ii++] = p.location[1];
        data[ii++] = p.location[2];
        // padding
        ii++;
        // uv
        // data[ii++] = p.uv[0];
        // data[ii++] = p.uv[1];
      }
    }

    // 48 is the size after alignment
    return [data.length, meshBytes] as [number, number];
  }

  getVertices(vertices: Float32Array, offset: number) {
    // copy vertices data to the buffer
    // TODO: do a centralized buffer creation
    this.bufferOffset = offset / 4;
    for (let i = 0; i < this.data.length; i++) {
      vertices[offset++] = this.data[i];
    }
    return offset;
  }

  getMeshes(meshes: ArrayBuffer, offset: number) {
    if (this.bufferOffset == null) {
      throw new Error("buffer offset is not available");
    }

    const intArray = new Int32Array(meshes);
    const floatArray = new Float32Array(meshes);

    // padding required: https://twitter.com/9ballsyndrome/status/1178039885090848770
    // under std430 layout, a struct in an array use the largest alignment of its member.
    // int face_count;
    intArray[offset++] = this.faces.length;
    // int offset;
    intArray[offset++] = this.bufferOffset;
    // emission intensity
    floatArray[offset++] = this.material.emissionIntensity || 0;
    // alpha
    floatArray[offset++] = this.material.specularExponent || 100;

    // vec3 emission; // 14 Bytes but 16 Bytes alignment
    floatArray[offset++] = this.material.emission?.r || 0;
    floatArray[offset++] = this.material.emission?.g || 0;
    floatArray[offset++] = this.material.emission?.b || 0;
    // padding
    offset++;
    // vec3 color;
    floatArray[offset++] = this.material.color?.r || 0;
    floatArray[offset++] = this.material.color?.g || 0;
    floatArray[offset++] = this.material.color?.b || 0;
    // padding
    offset++;
    // vec3 specular
    floatArray[offset++] = this.material.specular?.r || 0;
    floatArray[offset++] = this.material.specular?.g || 0;
    floatArray[offset++] = this.material.specular?.b || 0;
    // padding
    offset++;
    // vec3 refraction;
    floatArray[offset++] = this.material.refraction?.r || 0;
    floatArray[offset++] = this.material.refraction?.g || 0;
    floatArray[offset++] = this.material.refraction?.b || 0;
    // padding
    offset++;
    // bounding box
    floatArray[offset++] = this.bbox!.min[0];
    floatArray[offset++] = this.bbox!.min[1];
    floatArray[offset++] = this.bbox!.min[2];
    // padding
    offset++;
    // bounding box
    floatArray[offset++] = this.bbox!.max[0];
    floatArray[offset++] = this.bbox!.max[1];
    floatArray[offset++] = this.bbox!.max[2];
    // padding
    offset++;

    return offset;
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
  ) {
    let modelMatrix: mat4 | undefined = matrix as any;

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
