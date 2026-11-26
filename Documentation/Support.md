# Formats and support

mc-pcd-import reads PCD with three.js's PCDLoader.

## What is read

- ASCII, binary and LZF-compressed binary data.
- Coordinates, RGB colours, normals, intensity and labels.
- The viewpoint (sensor pose), which places the cloud.
- Organised clouds, leaving out their missing (NaN) points.

## Orientation and units

PCL clouds are usually Z up; the group turns them Y up unless `upAxis` is `'y'`. The cloud is moved near the origin.

## Limits

Fields other than those are not read; the warnings name them.
