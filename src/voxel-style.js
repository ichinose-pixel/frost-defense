// Visual sub-voxels use the existing world instancing draw. Logical resource cells stay intact.
// Reserve one slot per remaining logical block; detail degrades safely if capacity is tight.
function resourceVisualParts(e) {
  const { x, y, z, b } = e,
    j = hashJitter(x, y, z);
  if (b.t === "wood")
    return [
      [0, 0, 0, 0.44, 1, 0.44, 0x92623e],
      [0.23, 0.13, 0, 0.06, 0.53, 0.36, 0xc08b56],
    ];
  if (b.t === "leaf")
    return [
      [-0.23, -0.03, -0.23, 0.48, 0.6 * j, 0.48, 0x416e76],
      [0.23, 0.04, -0.23, 0.48, 0.72 * j, 0.48, 0x4f8187],
      [-0.23, 0.08, 0.23, 0.48, 0.65 * j, 0.48, 0x568891],
      [0.23, -0.03, 0.23, 0.48, 0.55 * j, 0.48, 0x3e6971],
      [0, 0.4, 0, 0.86, 0.13, 0.84, 0xe4f2f6],
    ];
  if (b.t === "coal")
    return [
      [-0.21, -0.15, 0, 0.5, 0.68, 0.72, 0x354251],
      [0.22, -0.04, -0.13, 0.44, 0.85, 0.54, 0x52677c],
      [0.15, -0.17, 0.29, 0.5, 0.64, 0.28, 0x728b9e],
      [-0.2, 0.22, 0, 0.42, 0.1, 0.59, 0xd6e5ec],
    ];
  return null;
}
