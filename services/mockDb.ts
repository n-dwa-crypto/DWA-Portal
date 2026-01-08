import { DbRecord, RecordType, ConnectionStatus, SystemStats } from '../types';

// Simulating a NodeJS Backend + DB interactions
class MockDbService {
  private readonly STORAGE_KEY = 'dwa_admin_db_v1';
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: ((status: ConnectionStatus) => void)[] = [];

  constructor() {
    this.simulateConnectionCycle();
  }

  // Simulate WebSocket/DB Connection health check
  private simulateConnectionCycle() {
    // Initial connection
    setTimeout(() => this.updateStatus(ConnectionStatus.CONNECTED), 1500);

    // Random hiccups to simulate real-world network conditions
    setInterval(() => {
      const rand = Math.random();
      if (rand > 0.95) {
        this.updateStatus(ConnectionStatus.CONNECTING);
        setTimeout(() => this.updateStatus(ConnectionStatus.CONNECTED), 2000);
      } else if (rand > 0.99) {
        this.updateStatus(ConnectionStatus.ERROR);
        setTimeout(() => this.updateStatus(ConnectionStatus.CONNECTING), 3000);
      }
    }, 10000);
  }

  private updateStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.listeners.forEach(l => l(status));
  }

  public subscribeToStatus(callback: (status: ConnectionStatus) => void) {
    this.listeners.push(callback);
    callback(this.connectionStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Simulate Async DB Write
  public async addRecord(type: RecordType, content: string): Promise<DbRecord> {
    return new Promise((resolve, reject) => {
      if (this.connectionStatus === ConnectionStatus.ERROR) {
        return reject(new Error("Database connection lost"));
      }

      setTimeout(() => {
        const records = this.getRecords();
        const newRecord: DbRecord = {
          id: Math.random().toString(36).substring(2, 11),
          type,
          content,
          timestamp: Date.now(),
          synced: true
        };
        
        records.unshift(newRecord);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
        resolve(newRecord);
      }, 600); // Simulate network latency
    });
  }

  // Simulate Async DB Read
  public async fetchRecords(type?: RecordType): Promise<DbRecord[]> {
     return new Promise((resolve) => {
      setTimeout(() => {
        const records = this.getRecords();
        if (type) {
          resolve(records.filter(r => r.type === type));
        } else {
          resolve(records);
        }
      }, 400);
     });
  }

  public getStats(): SystemStats {
    const records = this.getRecords();
    return {
      totalNews: records.filter(r => r.type === RecordType.NEWS).length,
      totalSanctions: records.filter(r => r.type === RecordType.SANCTION).length,
      lastSync: Date.now()
    };
  }

  private getRecords(): DbRecord[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("DB Read Error", e);
      return [];
    }
  }
}

export const dbService = new MockDbService();