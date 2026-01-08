// Experiment/Lab type definitions

export interface LabMeta {
  id: string;
  name: string;
  stackFile: string;
  stackClass: string;
  estimatedCost: string;
  estimatedTime: number;
}

export interface Lab {
  meta: LabMeta;
  guide: string;      // README.md markdown content
  stackCode: string;  // TypeScript CDK stack code
}
