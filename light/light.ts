import { BaseObject } from "../object";
import Color from "../color";
import { ToBuffer, Buffers, BuffersLength } from "../buffer";

export interface LightOption {
  intensity?: number;
  color?: Color;
}

export default abstract class Light extends BaseObject {
  // the light intensity
  intensity: number;
  // color of the light
  color: Color;

  constructor(
    name: string,
    { intensity = 1, color = Color.WHITE }: LightOption
  ) {
    super(`light/${name}`);

    this.intensity = intensity;
    this.color = color;
  }

  abstract bufferAppend(buffers: Buffers): void;
  abstract bufferCount(): BuffersLength;
}
