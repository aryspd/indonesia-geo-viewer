declare module 'shpjs' {
  const shp: (input: ArrayBuffer | Uint8Array) => Promise<any>;
  export default shp;
}
