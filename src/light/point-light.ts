import Light, { type LightOption } from "./light";
import { vec3 } from "gl-matrix";
import { LightBuffer, type BuffersLength, type Buffers } from "../buffer";

interface PointLightOption extends LightOption {
  position: vec3;
  radius?: number;
}

export default class PointLight extends Light {
  position: vec3;
  radius: number;

  constructor(name: string, options: PointLightOption) {
    super(name, options);
    this.position = options.position;
    this.radius = options.radius ?? 1;
  }

  bufferAppend(buffers: Buffers): void {
    buffers.light.append({
      intensity: this.intensity,
      position: this.position,
      color: this.color,
      radius: this.radius,
    });
  }
  bufferCount(): BuffersLength {
    return {
      light: LightBuffer.bytes,
    };
  }
}
