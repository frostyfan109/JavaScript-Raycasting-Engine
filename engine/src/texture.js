import TextureWorker from './texture.worker.js';
async function GIFFrame(frame) {
  const r = Date.now();
  console.time(r);
  const c = document.createElement('canvas');
  c.width = frame.dims.width;
  c.height = frame.dims.height;
  console.timeEnd(r);

  console.time(r);

  const ctx = c.getContext('2d');
  const imageData = ctx.createImageData(c.width, c.height);

  console.timeEnd(r);

  console.time(r);
  imageData.data.set(frame.patch);
  ctx.putImageData(imageData, 0, 0);

  console.timeEnd(r);
  console.time(r);
  c.frameLength = frame.delay;

  console.timeEnd(r);

  return c;
}

export class TextureData {
  constructor(key) {
    this.key = key;
    this.frames = [];
    this.loaded = false;
  }

  async load(url, options = {}) {
    if (!new RegExp('^(?:[a-z]+:)?//', 'i').test(url)) {
      url = window.location + url;
    }
    if (/.*\.gif/.test(url)) {
      /**
       * GIF file
       *
       * @param {Object} options - Object of options.
       * @param {Boolean} alpha - If false, the alpha layer will be stripped from the frames in the GIF. Recommended if variable height is disabled.
       *    NOTE: This is applied on loading, and therefore it applies to all instances of the texture. Additionally, it means that it is static and may not be changed post-load.
       *
       */
      const worker = new TextureWorker();
      worker.addEventListener('message', (e) => {
        let msg = e.data;
        // For some reason `ImageBitmap` objects lose all additional properties when sent over `postMessage`
        msg.loadedFrames = msg.loadedFrames.map((f) => {
          f.bmp.frameLength = f.frameLength;
          return f.bmp;
        })
        if (msg.type === 'loadGIF') {
          this.loaded = true;
          this.frames = this.frames.concat(msg.loadedFrames);
          return;
        }
      });
      worker.postMessage({
        type: 'loadGIF',
        url: url,
        options: options
      })
    } else if (/.*(\.mp4|\.m4a|\.m4p|\.m4b|\.m4r|\.m4v)/.test(url)) {
      /**
       * MP4 file
       *
       * @param {Object} options - Object of options.
       * @param {Object} videoProps - Object of properties that will be applied to the video element on instantiation.
       *
       */
      const video = document.createElement('video');
      video.src = url;
      video.muted = true; // Chrome 66+ requires that the video must be muted to autoplay without user interaction.
      Object.entries(options.videoProps).forEach(([key, value]) => {
        video[key] = value;
      });
      video.onloadedmetadata = () => {
        console.log(1);
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        this.frames.push(video);
        this.loaded = true;
        video.play();
        return;
      };
    } else {
      /**
       * Image file (duck test)

       */
      const image = new Image();
      image.src = url;
      image.onload = () => {
        this.loaded = true;
        return;
      };
      image.onerror = () => {
        this.loaded = true;
        throw new Error(`Failed to load texture "${this.key}" at url "${url}"`);
      };
      this.frames.push(image);
    }
  }
}

export class Texture {
  constructor(textureData) {
    this.textureData = textureData;
    this.key = textureData.key;
    this.loaded = textureData.loaded;
    this.frames = textureData.frames;
    this._currentFrame = 0;
    this.elapsed = 0;
    this.prevTime = null;
  }

  update() {
    if (this.loaded !== this.textureData.loaded) {
      this.loaded = this.textureData.loaded;
      this.frames = this.textureData.frames.slice();
    }

    const currentFrame = this.getCurrentFrame();

    if (currentFrame !== undefined) {
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
