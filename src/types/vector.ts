export type VectorGeometryFamily = 'Point' | 'LineString' | 'Polygon';

export interface ImportedVectorLayer {
  id: string;
  name: string;
  sourceFileName: string;
  sourceFormat: 'GeoJSON' | 'Shapefile' | 'Shapefile ZIP';
  data: {
    type: 'FeatureCollection';
    features: any[];
    bbox?: [number, number, number, number];
  };
  geometryTypes: VectorGeometryFamily[];
  featureCount: number;
  duplicateFeaturesRemoved: number;
  skippedInvalidFeatures: number;
  polygonRingsClosed: number;
  pointCount: number;
  lineCount: number;
  polygonCount: number;
  bbox: [number, number, number, number];
  fingerprint: string;
  color: string;
  visible: boolean;
  opacity: number;
  showLabels: boolean;
}
