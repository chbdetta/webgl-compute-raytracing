const id = (x: number) => x;

interface Time {
  now: number;
  delta: number;
}

export default class Timer {
  static timers: Map<number, Timer> = new Map();
  static count = 0;

  #id: number;
  #time: number;
  #prevTime: number;
  #speed: number;

  #enabled = false;

  #prevRealTime: number;

  constructor(speed = 0.001) {
    this.#id = Timer.count++;
    this.#time = this.#prevTime = 0;

    if (speed <= 0) {
      throw new Error("speed must be positive");
    }
    this.#speed = speed;

    Timer.timers.set(this.#id, this);
  }

  checkTime(modifier = id): Time {
    const ret = {
      now: modifier(this.#time),
      delta: modifier(this.#time) - modifier(this.#prevTime),
    };

    this.#prevTime = this.#time;

    return ret;
  }

  tick(): void {
    if (this.#enabled) {
      const now = performance.now();
      const delta = now - this.#prevRealTime;

      this.#time = delta * this.#speed + this.#time;
      this.#prevRealTime = now;

      requestAnimationFrame(this.tick.bind(this));
    }
  }

  stop(): void {
    this.#enabled = false;
  }

  start(): void {
    this.#enabled = true;
    this.#prevRealTime = performance.now();
    this.tick();
  }
}
