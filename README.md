# mc-pcd-import

A PCD importer for [three.js](https://threejs.org/), written in TypeScript. It reads Point Cloud Library .pcd files, ASCII, binary or compressed, with their colours, normals, intensity and labels, placed by their viewpoint, in metres and Y up. It was made for [SceneEditor](https://github.com/VJigouline/SceneEditor), and works in any three.js application.

```ts
import { loadPcd } from 'mc-pcd-import';

const result = await loadPcd(await file.arrayBuffer());
scene.add(result.group);
console.log(result.warnings);       // anything that couldn't be read
```

## What it reads

- ASCII, binary and LZF-compressed binary data.
- Coordinates, RGB colours, normals, intensity and labels.
- The viewpoint (sensor pose), which places the cloud.
- Organised clouds, leaving out their missing (NaN) points.

Fields other than those are not read; the warnings name them. See [Formats and support](Documentation/Support.md) for the details.

## Install

The package is not on the npm registry. Install it from GitHub:

```sh
npm install github:VJigouline/mc-pcd-import
```

`three` (r160 or later) is a peer dependency. The package builds itself on install.

## Documentation

- [Getting started](Documentation/GettingStarted.md)
- [API](Documentation/API.md)
- [Formats and support](Documentation/Support.md)
- [Using it in SceneEditor](Documentation/SceneEditor.md)

## Development

```sh
npm install
npm test           # unit tests, with Vitest
npm run typecheck
npm run build      # dist/
```

The tests load real PCD files, kept in [`tests/samples`](tests/samples/README.md) with their licences. It needs Node.js 22 or later.

## Licence

[MIT](LICENSE)
