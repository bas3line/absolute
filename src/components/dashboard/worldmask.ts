// Land mask for the panel's deploy map, rasterised from the shapefile once; generated data, not hand-edited.
// Source: Natural Earth 1:110m physical land (ne_110m_land), public domain.
// https://www.naturalearthdata.com
//
// Equirectangular crop 100°W–125°E, 66°N–9°S, 180 × 60 cells of 1.25°.
// Wide enough for every location in the catalogue, New York to Hong Kong.
// A cell is land when at least 4 of 9 sample points fall on land (5774 land cells).
// Each row is run lengths, two base-36 characters per run, alternating
// water and land and always starting with water.

export const MASK = {
  cols: 180,
  rows: 60,
  west: -100,
  east: 125,
  north: 66,
  south: -9,
  rle: [
    "000c07070201090a0d080k090208041w",
    "0009020406070a090f060k09012a",
    "0007060109050b07130a022b",
    "00050d050h06120a032b",
    "00050d060j02130b03030126",
    "00050c0802021j0a0529",
    "00060c0c19030b040629",
    "000a090c180308030103042b",
    "000c050f180307020101072b",
    "000e020i130202030704012g",
    "000f020i11030105032o",
    "000z1505022p",
    "000w02011502032r",
    "000s0504152u",
    "000s0505132v",
    "000s1f0u010a021m",
    "000w1b0b010d02030108031n",
    "000p02021e0b020b0807031n",
    "000o1d0a050303080b05031n",
    "000o1d090803020802040406041l",
    "000l1g07070104020203020j021m",
    "000k1g080d010203020i041g020102",
    "000k1h070a020502020i041g05",
    "000j1k0204080e2203",
    "000j1k0e0a010601021v04",
    "000i1k0f0j1w04",
    "000g1l0h0i1x03",
    "000f1l0l0304071z02",
    "000f1l2x03",
    "0004030105021k1c011m02",
    "00020c021i1d021k03",
    "00020c021h12020b0301011f04",
    "00020d011g14010c0301021d04",
    "00021t15020g0815010103",
    "00020b031f16020h0712030103",
    "00020e031b18010h080f030g0a",
    "0003050208021b17020f0b0b050b03010b",
    "000304030c031617030d0c0a070a02020b",
    "000a080103011818020c0d09080a0b0202",
    "00091m1803090g07090b0a0202",
    "05081h1a02070i050e09090103",
    "07061h1b01050l040e090a0201",
    "0a031i1d0o040f0101060b0101",
    "0b0208020101161c05010j040f0102050d",
    "0b02070a121h0k030f0103030c02",
    "0d05010c121g0k0201010e0104010f",
    "0e02010g111e0o010e010i02",
    "0i0g111d0o010f010c010501",
    "0i0k0y08040z110103020a0305",
    "0i0l1c0v13020103080405",
    "0i0l1d0t15020102060506",
    "0h0n1b0t1704040805",
    "0g0o1b0s180404070201010101",
    "0f0s180r1a0304070101010102",
    "0f0u160q1c030405020302",
    "0g0x130o1d0404010102020302",
    "0f0z130n1e030c0201",
    "0f11120l1x",
    "0g10120m1h050a",
    "0h0z120l1n020201010103",
  ],
} as const;

/** Decodes the mask into a row-major array of 0 (water) and 1 (land). */
export function decodeMask(): Uint8Array {
  const out = new Uint8Array(MASK.cols * MASK.rows);
  MASK.rle.forEach((row, r) => {
    let c = 0;
    let land = 0;
    for (let i = 0; i < row.length; i += 2) {
      const n = parseInt(row.slice(i, i + 2), 36);
      if (land) out.fill(1, r * MASK.cols + c, r * MASK.cols + c + n);
      c += n;
      land ^= 1;
    }
  });
  return out;
}

/**
 * Maps a 0–1 position on a whole-world equirectangular map (as in catalog.locations)
 * to fractional cell coordinates inside this crop.
 */
export function toCell(x: number, y: number) {
  const lon = x * 360 - 180;
  const lat = 90 - y * 180;
  return {
    lon,
    lat,
    col: ((lon - MASK.west) / (MASK.east - MASK.west)) * MASK.cols,
    row: ((MASK.north - lat) / (MASK.north - MASK.south)) * MASK.rows,
  };
}
