// Reads Point Cloud Library .pcd files, ASCII, binary or LZF-compressed binary, with three.js's
// PCDLoader, and colours them by colour, intensity or height.

import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { countModel, ImportFiles, orient, type ImportInput, type ImportStats } from './common.js';
import { baseName, buildPoints, type ColorMode, type PointCloudOptions } from './points.js';

export { ImportFiles, countModel } from './common.js';
export type { ImportInput, ImportFile, ImportData, ImportStats } from './common.js';
export type { ColorMode, PointCloudOptions } from './points.js';

export interface PcdOptions extends PointCloudOptions {
  /** The .pcd file to open, if several are given. By default, the first. */
  main?: string;
  /** PCL clouds are usually Z up, the default; 'y' leaves the cloud as it is. */
  upAxis?: 'y' | 'z';
  /** Metres per file unit. Default 1: PCL works in metres. */
  unitScale?: number;
}

export interface PcdHeader {
  version: string;
  /** Field names, such as x, y, z, rgb, intensity, normal_x. */
  fields: string[];
  /** Bytes, type (F, I or U) and count of each field. */
  size: number[];
  type: string[];
  count: number[];
  /** Width and height: an organised cloud has a height above 1. */
  width: number;
  height: number;
  points: number;
  /** The sensor's pose: tx ty tz qw qx qy qz. */
  viewpoint: number[];
  data: 'ascii' | 'binary' | 'binary_compressed';
}

export interface PcdLoadResult {
  /** The point cloud, in a group named after the file. */
  group: THREE.Group;
  header: PcdHeader;
  /** The file's point that is at the cloud's origin. */
  origin: [number, number, number];
  colorBy: ColorMode;
  warnings: string[];
  stats: ImportStats;
}

export class PcdImportError extends Error {
  override name = 'PcdImportError';
}

/** Reads the header of a PCD file. */
export function readPcdHeader(bytes: Uint8Array): PcdHeader {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 8192)));
  const end = /^DATA\s+(\S+)/im.exec(head);
  if (!/^(#.*\r?\n)*\s*(VERSION|FIELDS)\b/i.test(head) || !end) throw new PcdImportError('Not a PCD file: it has no PCD header');
  const field = (name: string) => new RegExp(`^${name}\\s+(.*)$`, 'im').exec(head)?.[1]?.trim().split(/\s+/) ?? [];
  const nums = (name: string) => field(name).map(Number);
  const fields = field('FIELDS');
  const header: PcdHeader = {
    version: field('VERSION')[0] ?? '',
    fields,
    size: nums('SIZE'),
    type: field('TYPE'),
    count: field('COUNT').length ? nums('COUNT') : fields.map(() => 1),
    width: nums('WIDTH')[0] ?? 0,
    height: nums('HEIGHT')[0] ?? 1,
    points: nums('POINTS')[0] ?? 0,
    viewpoint: field('VIEWPOINT').length ? nums('VIEWPOINT') : [0, 0, 0, 1, 0, 0, 0],
    data: end[1]!.toLowerCase() as PcdHeader['data'],
  };
  if (!header.points) header.points = header.width * header.height;
  if (!['ascii', 'binary', 'binary_compressed'].includes(header.data)) throw new PcdImportError(`Unknown PCD data encoding ${end[1]}`);
  if (!['x', 'y', 'z'].every((f) => fields.includes(f))) throw new PcdImportError('The PCD file has no x, y and z fields');
  return header;
}

/** Reads a PCD point cloud. */
export async function loadPcd(input: ImportInput, options: PcdOptions = {}): Promise<PcdLoadResult> {
  const files = await ImportFiles.from(input, 'cloud.pcd');
  const main = files.main(['pcd'], options.main) ?? files.files[0];
  if (!main) throw new PcdImportError('There is no .pcd file to open');
  const header = readPcdHeader(main.bytes);
  const warnings: string[] = [];
  const data = main.bytes.buffer.slice(main.bytes.byteOffset, main.bytes.byteOffset + main.bytes.byteLength) as ArrayBuffer;
  let parsed: THREE.Points;
  try {
    parsed = new PCDLoader().parse(data);
  } catch (error) {
    throw new PcdImportError(`${main.name} could not be read: ${(error as Error).message}`);
  }
  const g = parsed.geometry;
  const position = g.getAttribute('position');
  if (!position) throw new PcdImportError(`${main.name} has no points`);

  // Organised clouds mark missing points with NaN; they are left out.
  const n = position.count;
  const keep: number[] = [];
  for (let i = 0; i < n; i++) if (Number.isFinite(position.getX(i)) && Number.isFinite(position.getY(i)) && Number.isFinite(position.getZ(i))) keep.push(i);
  if (keep.length < n) warnings.push(`${n - keep.length} points without coordinates were left out`);
  const pick = (attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined, size: number, Out: Float32ArrayConstructor | Float64ArrayConstructor) => {
    if (!attr) return undefined;
    const out = new Out(keep.length * size);
    keep.forEach((i, j) => {
      for (let k = 0; k < size; k++) out[j * size + k] = attr.getComponent(i, k);
    });
    return out;
  };
  let intensity = pick(g.getAttribute('intensity'), 1, Float32Array) as Float32Array | undefined;
  if (intensity) {
    let max = 0;
    for (const v of intensity) if (Number.isFinite(v)) max = Math.max(max, v);
    intensity = intensity.map((v) => (Number.isFinite(v) ? v / (max || 1) : 0));
  }
  const name = baseName(main.name, /\.pcd$/i);
  const { points, origin, colorBy } = buildPoints(name, {
    positions: pick(position, 3, Float64Array) as Float64Array,
    colors: pick(g.getAttribute('color'), 3, Float32Array) as Float32Array | undefined,
    normals: pick(g.getAttribute('normal'), 3, Float32Array) as Float32Array | undefined,
    intensity,
  }, options, options.upAxis === 'y' ? 1 : 2);
  const label = g.getAttribute('label');
  if (label) points.geometry.setAttribute('label', new THREE.Int32BufferAttribute(pick(label, 1, Float64Array)!, 1));

  // The sensor's pose places the cloud.
  const [tx = 0, ty = 0, tz = 0, qw = 1, qx = 0, qy = 0, qz = 0] = header.viewpoint;
  const pose = new THREE.Group();
  pose.name = `${name} viewpoint`;
  pose.position.set(tx, ty, tz);
  pose.quaternion.set(qx, qy, qz, qw).normalize();
  pose.add(points);
  const extra = header.fields.filter((f) => !['x', 'y', 'z', 'rgb', 'rgba', 'normal_x', 'normal_y', 'normal_z', 'intensity', 'label', 'curvature', '_'].includes(f));
  if (extra.length) warnings.push(`Fields not read: ${extra.join(', ')}`);
  const group = orient(pose, name, options.upAxis !== 'y', options.unitScale ?? 1);
  return { group, header, origin, colorBy, warnings, stats: countModel(group) };
}
