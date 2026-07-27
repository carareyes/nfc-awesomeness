// lib/nfc/types.ts
export type ParsedPayload = string;

export interface NDEFRecord {
  id: string | null;
  type: string | null;
  payload: ParsedPayload | null;
  tnf: number;
}

export interface NFCTagData {
  id: string;
  techTypes: string[];
  type?: string;
  maxSize?: number;
  isWritable?: boolean;
  canMakeReadOnly?: boolean;
  ndefRecords: NDEFRecord[]; 
  rawData: any; 
  timestamp: string;
}

export interface ThreatReport {
  id: string;
  timestamp: string;
  threatType: 'CLONING_ATTEMPT' | 'UNAUTHORISED_READ' | 'SUSPICIOUS_PATTERN';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  tagId?: string;
  blocked: boolean;
}

export interface ClonedCardData {
  originalUID: string;
  extractedData: {
    uid: string;
    type?: string;
    techTypes: string[];
    records: NDEFRecord[];
    timestamp: string;
    realContent: string;
    maxSize?: number;
    isWritable?: boolean;
  };
  clonedAt: string;
}

export interface CloneResult {
  success: boolean;
  message: string;
  clonedData?: ClonedCardData;
  error?: string;
}