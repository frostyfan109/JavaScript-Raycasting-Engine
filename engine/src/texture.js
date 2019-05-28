import './external/gifuct-js.min';

function GIFFrame(frame) {
  const c = document.createElement('canvas');
  c.width = frame.dims.width;
  c.height = frame.dims.height;
  const ctx = c.getContext('2d');
  const imageData = ctx.createImageData(c.width, c.height);
  imageData.data.set(frame.patch);
  ctx.putImageData(imageData, 0, 0);

  const img = new Image();
  img.src = c.toDataURL();
  img.frameLength = frame.delay;
  return img;
}

export class TextureData {
  constructor(key, path) {
    this.key = key;
    this.path = path;
    this.frames = [];
    this.loaded = false;
  }

  load(data, options = {}) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(data);
      if (/.*\.gif/.test(this.path)) {
        // gif
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result;
          const time = Date.now();
          // eslint-disable-next-line
          const gif = new GIF(arrayBuffer);
          console.log(Date.now() - time);
          const frames = gif.decompressFrames(true);
          if ('alpha' in options && !options.alpha) {
            frames.forEach((f) => {
              if (f.disposalType === 1) {
                for (let i = 0; i < f.patch.length; i++) {
                  if (f.patch[i] === 0) {
                    f.patch[i] = 0;
                  }
                }
              }
            });
          }
          this.frames.push(...frames.map(f => GIFFrame(f)));
          this.loaded = true;
          URL.revokeObjectURL(url);
          resolve();
        };
        reader.readAsArrayBuffer(data);
      } else if (/.*(\.mp4|\.m4a|\.m4p|\.m4b|\.m4r|\.m4v)/.test(this.path)) {
        // mp4
        const video = document.createElement('video');
        video.src = url;
        video.autoplay = true;
        video.loop = true;
        video.onloadedmetadata = () => {
          this.loaded = true;
          video.width = video.videoWidth;
          video.height = video.videoHeight;
          // document.body.appendChild(video);
          URL.revokeObjectURL(url);
          resolve();
        };
        this.frames.push(video);
      } else {
        const image = new Image();
        image.src = url;
        image.onload = () => {
          this.loaded = true;
          URL.revokeObjectURL(url);
          resolve();
        };
        image.onerror = () => {
          this.loaded = true;
          reject(new Error(`Failed to load texture '${this.key}'`));
          URL.revokeObjectURL(url);
        };
        this.frames.push(image);
      }
    });
  }
}

export class Texture {
  constructor(textureData) {
    this.textureData = textureData;
    this.key = textureData.key;
    this.path = textureData.path;
    this.frames = textureData.frames;
    this._currentFrame = 0;
    this.elapsed = 0;
    this.prevTime = null;
  }

  update() {
    const currentFrame = this.getCurrentFrame();
    // console.log(this.frames);
    if (this.textureData.loaded && currentFrame.frameLength !== undefined) {
      const currentTime = Date.now();
      if (this.prevTime === null) {
        this.prevTime = currentTime;
      } else {
        const elapsed = currentTime - this.prevTime;
        this.elapsed += elapsed;
        if (this.elapsed >= currentFrame.frameLength) {
          this.elapsed = 0;
          this.playNextFrame();
        }
        this.prevTime = currentTime;
      }
    }
  }

  playNextFrame() {
    this._currentFrame++;
    if (this._currentFrame >= this.frames.length) {
      this._currentFrame = 0;
    }
  }

  getCurrentFrame() {
    return this.frames[this._currentFrame];
  }
}
