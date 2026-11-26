# PCD test files

Real PCD files that the tests load. They are unchanged copies, taken at commit `1d3772857e` of three.js.

| Files | What they cover | Source and licence |
| --- | --- | --- |
| `ascii/simple.pcd`, `binary/Zaghetto.pcd`, `binary_compressed/pcl_logo.pcd` | Each data encoding, with colours | The [three.js](https://github.com/mrdoob/three.js) repository (`examples/models/pcd`), under its [MIT licence](https://github.com/mrdoob/three.js/blob/dev/LICENSE); no other licence is stated for them. |

These files keep their own licences. They are test data only, and are not part of the npm package, which includes only `dist`, `Documentation`, `README.md` and `LICENSE`.
