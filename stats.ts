class Stats {
  static ItemSize = 5;

  width: number;
  height: number;

  buffer: Float32Array;
  data: number[];
  prev = 0;
  delta = 0;

  constructor(localX: number, localY: number) {
    this.buffer = new Float32Array(Stats.ItemSize * localX * localY);
    this.data = new Array(4).fill(0);
  }

  get diff() {
    return this.data[0];
  }

  get mainRay() {
    return this.data[1];
  }

  get rayCount() {
    return this.data[2];
  }

  get rayTest() {
    return this.data[3];
  }

  get rayIntersection() {
    return this.data[4];
  }

  get fps() {
    return 1000 / this.delta;
  }

  reduce() {
    const localSize = this.buffer.length / Stats.ItemSize;

    for (let i = 0; i < Stats.ItemSize; i++) {
      this.data[i] = this.buffer[i * localSize];
      for (let j = 1; j < this.buffer.length / Stats.ItemSize; j++) {
        if (i === 0) {
          this.data[i] += (this.buffer[i * localSize + j] - this.data[i]) / j;
        } else {
          this.data[i] += this.buffer[i * localSize + j];
        }
      }
    }
  }

  reset() {
    this.buffer.fill(0);
    this.data.fill(0);
  }
}

export default Stats;
