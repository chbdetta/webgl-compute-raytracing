import { StatsBuffer } from "./buffer";

class Stats {
  static ItemSize = 5;

  buffer: StatsBuffer;
  data: number[];
  prev = 0;
  delta = 0;

  constructor(localX: number, localY: number) {
    this.buffer = new StatsBuffer(Stats.ItemSize * localX * localY);
    this.data = new Array(4).fill(0);
  }

  get diff(): number {
    return this.data[0];
  }

  get mainRay(): number {
    return this.data[1];
  }

  get rayCount(): number {
    return this.data[2];
  }

  get rayTest(): number {
    return this.data[3];
  }

  get rayIntersection(): number {
    return this.data[4];
  }

  get fps(): number {
    return 1000 / this.delta;
  }

  reduce(): void {
    const buffer = this.buffer.f32;
    const localSize = buffer.length / Stats.ItemSize;

    for (let i = 0; i < Stats.ItemSize; i++) {
      this.data[i] = buffer[i * localSize];
      for (let j = 1; j < buffer.length / Stats.ItemSize; j++) {
        if (i === 0) {
          this.data[i] += (buffer[i * localSize + j] - this.data[i]) / j;
        } else {
          this.data[i] += buffer[i * localSize + j];
        }
      }
    }
  }

  reset(): void {
    this.buffer.f32.fill(0);
    this.data.fill(0);
  }
}

export default Stats;
