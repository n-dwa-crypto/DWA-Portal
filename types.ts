
export enum RecordType {
  NEWS = 'NEWS',
  SANCTION = 'SANCTION'
}

export interface DbRecord {
  id: string;
  type: RecordType;
  content: string;
  timestamp: number;
  synced: boolean;
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  CONNECTING = 'CONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

export interface SystemStats {
  totalNews: number;
  totalSanctions: number;
  lastSync: number | null;
}
