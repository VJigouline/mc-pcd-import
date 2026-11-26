# Getting started

## Install

```sh
npm install three github:VJigouline/mc-pcd-import
```

## Open a file

`loadPcd` takes the file's contents (`ArrayBuffer`, `Uint8Array` or string), a browser `File`, `{ name, data }`, or an iterable of files. Zip archives among them are opened. It returns a promise of the model.

```ts
import * as THREE from 'three';
import { loadPcd } from 'mc-pcd-import';

const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
input.addEventListener('change', async () => {
  const result = await loadPcd(input.files![0]!);
  scene.add(result.group);
  for (const warning of result.warnings) console.warn(warning);
});
```

## What you get

- **`group`:** a `THREE.Group` holding the model, named after the file.
- **`stats`:** counts of what was read.
- **`warnings`:** anything that couldn't be read or was left out.

PCL clouds are usually Z up; the group turns them Y up unless `upAxis` is `'y'`. The cloud is moved near the origin.

## Options

- **`main`** (default the first .pcd file): The file to open, if several are given.
- **`colorBy`** (default 'auto'): `'rgb'`, `'intensity'`, `'classification'`, `'elevation'` or `'none'`; `'auto'` takes colours, then intensity, then height.
- **`recentre`** (default true): Moves the cloud near the origin, as scan coordinates are too large for the GPU's precision; `origin` gives the point moved there.
- **`pointSize`** (default 2): Point size in pixels.
- **`upAxis`** (default 'z'): `'y'` leaves the cloud as it is.
- **`unitScale`** (default 1): Metres per unit.

See the [API](API.md) for every field of the result.
