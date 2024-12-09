// Somehow works
import { window } from './external/gifuct-js.min.js';

const GIF = window.GIF;

async function GIFFrame(frame, options) {
  let imageData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
  let imageBitmap = await createImageBitmap(imageData, 0, 0, frame.dims.width, frame.dims.height);
  return {
    bmp: imageBitmap,
    frameLength: frame.delay
  };
}

self.addEventListener('message', function(e) {
  let msg = e.data;
  if (msg.type === 'loadGIF') {
    let url = msg.url;
    let options = msg.options;
    fetch(url, {
      method: 'GET'
    })
    .then((resp) => {
      if (!resp.ok) {
        throw new Error('Fetch failed at "' + url + '" ' + resp.statusText + " (" + resp.status + ")");
      }
      else {
        return resp.arrayBuffer();
      }
    })
    .then((data) => new GIF(data))
    .then((gif) => {
      let frames = gif.decompressFrames(true);
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
      frames.forEach((frame) => {
        // delete frame.pixels;
      });
      let promisedFrames = frames.map((f) => GIFFrame(f, options));
      Promise.all(promisedFrames).then((loadedFrames) => {
        // console.log('finished',data);
        self.postMessage({
          type: 'loadGIF',
          loadedFrames: loadedFrames
        });
      });
    });
  }
  if (msg.type === 'loadGIFFrames') {

  }
});
