import { DbRecord, RecordType, ConnectionStatus, SystemStats } from '../types';

const INITIAL_NEWS = `Trump coin price plunges 94% in a year as memecoin frenzy fades. Token falls sharply from its peak just before US president’s inauguration in January 2025. Despite the fall in price, $TRUMP remains the fifth-biggest memecoin by market capitalisation.

Donald Trump’s memecoin has plunged more than 90 per cent in price from its peak a year ago, in a sign of how the excitement around the US president’s controversial cryptocurrency has evaporated. Launched ahead of Trump’s inauguration in January last year, the $TRUMP memecoin briefly surged from $1.20 to a high of $75.35, according to CoinMarketCap data. One year on, it is trading at $4.86, a 94 per cent decline from that peak.

A couple of days after the $TRUMP coin was launched, his wife Melania Trump also debuted a memecoin. The price of that jumped to a high of $13.73 but is now trading slightly below $0.15, according to CoinMarketCap data, a fall of 99 per cent from its peak. The sharp falls in price leave investors who bought at the peak nursing heavy losses. The Trumps’ crypto activities have generated more than $1bn in pre-tax profits, a recent investigation found.

Investor enthusiasm for memecoins reached fever pitch in late 2023 and early 2024. The volatile tokens have no fundamental value or business model. Despite the fall in price, $TRUMP remains the fifth-biggest memecoin by market capitalisation. The president and his wife’s memecoins have been heavily criticised by crypto industry figures for being a moneymaking mechanism.

The Trump companies have meanwhile moved on to other things. Trump Media & Technology Group, which runs the Truth Social platform, is planning to issue a new crypto token to shareholders on February 2, as part of a deal with exchange Crypto.com.`;

class MockDbService {
  private readonly STORAGE_KEY = 'dwa_admin_db_v3'; // Incremented version to force update with new news
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: ((status: ConnectionStatus) => void)[] = [];

  constructor() {
    this.initBootstrap();
    this.simulateConnectionCycle();
  }

  private initBootstrap() {
    const records = this.getRecords();
    if (records.length === 0) {
      const bootstrapRecord: DbRecord = {
        id: 'bootstrap-news-trump-001',
        type: RecordType.NEWS,
        content: INITIAL_NEWS,
        timestamp: Date.now(),
        synced: true
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([bootstrapRecord]));
    }
  }

  private simulateConnectionCycle() {
    setTimeout(() => this.updateStatus(ConnectionStatus.CONNECTED), 800);
    setInterval(() => {
      const rand = Math.random();
      if (rand > 0.98) {
        this.updateStatus(ConnectionStatus.CONNECTING);
        setTimeout(() => this.updateStatus(ConnectionStatus.CONNECTED), 1500);
      }
    }, 15000);
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
      }, 300);
    });
  }

  public async fetchRecords(type?: RecordType): Promise<DbRecord[]> {
     return new Promise((resolve) => {
      setTimeout(() => {
        const records = this.getRecords();
        if (type) {
          resolve(records.filter(r => r.type === type));
        } else {
          resolve(records);
        }
      }, 200);
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
      return [];
    }
  }
}

export const dbService = new MockDbService();