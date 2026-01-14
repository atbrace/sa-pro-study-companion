// Experiment/Lab type definitions

export interface LabMeta {
  id: string;
  name: string;
  stackFile: string;
  stackClass: string;
  estimatedCost: string;
  estimatedTime: number;
  exam?: 'sap-c02' | 'mla-c01';  // Optional: defaults to sap-c02
}

export interface Lab {
  meta: LabMeta;
  guide: string;      // README.md markdown content
  stackCode: string;  // TypeScript CDK stack code
}
