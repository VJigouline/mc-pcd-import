import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { loadPcd, PcdImportError, readPcdHeader } from '../src/index.js';
import { sample } from './files.js';

const points = (g: THREE.Object3D) => {
  let p: THREE.Points | undefined;
  g.traverse((o) => { if ((o as THREE.Points).isPoints) p = o as THREE.Points; });
  return p!;
};

describe('PCD', () => {
  it('reads ASCII, binary and compressed files', async () => {
    const ascii = await loadPcd(sample('ascii/simple.pcd'));
    expect(ascii.header.data).toBe('ascii');
    expect(ascii.stats.points).toBeGreaterThan(0);

    const binary = await loadPcd(sample('binary/Zaghetto.pcd'));
    expect(binary.header.data).toBe('binary');
    expect(binary.stats.points).toBe(binary.header.points);

    const compressed = await loadPcd(sample('binary_compressed/pcl_logo.pcd'));
    expect(compressed.header.data).toBe('binary_compressed');
    expect(compressed.colorBy).toBe('rgb');
    expect(compressed.stats.points).toBe(compressed.header.points);
  });

  it('reads the header and applies the viewpoint', async () => {
    const text = 'VERSION .7\nFIELDS x y z intensity\nSIZE 4 4 4 4\nTYPE F F F F\nCOUNT 1 1 1 1\nWIDTH 3\nHEIGHT 1\nVIEWPOINT 10 0 0 1 0 0 0\nPOINTS 3\nDATA ascii\n0 0 0 0\n1 0 0 5\nnan nan nan 0\n';
    const header = readPcdHeader(new TextEncoder().encode(text));
    expect(header).toMatchObject({ version: '.7', fields: ['x', 'y', 'z', 'intensity'], points: 3, viewpoint: [10, 0, 0, 1, 0, 0, 0] });
    const r = await loadPcd(text);
    expect(r.stats.points).toBe(2);
    expect(r.colorBy).toBe('intensity');
    expect(r.warnings[0]).toContain('1 points without coordinates');
    const p = points(r.group);
    expect(p.parent!.position.x).toBe(10);
    expect(p.geometry.getAttribute('color').getX(1)).toBeCloseTo(1);
  });

  it('refuses files that are not PCD', async () => {
    await expect(loadPcd('hello')).rejects.toThrow(PcdImportError);
  });
});
