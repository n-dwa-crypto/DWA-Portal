import { DbRecord, RecordType, ConnectionStatus, SystemStats } from '../types';

const BOOTSTRAP_ITEMS = [
  {
    id: 'news-fiscal-uncertainty-2025',
    type: RecordType.NEWS,
    content: `Market Stress from US fiscal uncertainty weighs on crypto — BTC sliding
• Bitcoin and broader digital assets are slipping sharply amid macro and political uncertainty in the U.S., even as lawmakers close in on avoiding a government shutdown.  
• This kind of risk-off sentiment drives liquidations in crypto futures and worsens volatility, as markets repricing expectations for Fed policy, liquidity, and risk assets.`
  },
  {
    id: 'news-illicit-activity-2025',
    type: RecordType.NEWS,
    content: `Global illicit crypto activity surges — $82B+ money laundering footprint
• Researchers report that **crypto money-laundering hit at least $82 billion in 2025, driven by sophisticated networks and cross-border concealment tactics.  
• This surge continues despite enforcement actions, highlighting how digital assets are intertwined with geopolitical pressures, sanction evasion, and criminal finance.`
  },
  {
    id: 'bootstrap-news-trump-001',
    type: RecordType.NEWS,
    content: `Trump coin price plunges 94% in a year as memecoin frenzy fades. Token falls sharply from its peak just before US president’s inauguration in January 2025. Despite the fall in price, $TRUMP remains the fifth-biggest memecoin by market capitalisation.

Donald Trump’s memecoin has plunged more than 90 per cent in price from its peak a year ago, in a sign of how the excitement around the US president’s controversial cryptocurrency has evaporated. Launched ahead of Trump’s inauguration in January last year, the $TRUMP memecoin briefly surged from $1.20 to a high of $75.35, according to CoinMarketCap data. One year on, it is trading at $4.86, a 94 per cent decline from that peak.

A couple of days after the $TRUMP coin was launched, his wife Melania Trump also debuted a memecoin. The price of that jumped to a high of $13.73 but is now trading slightly below $0.15, according to CoinMarketCap data, a fall of 99 per cent from its peak. The sharp falls in price leave investors who bought at the peak nursing heavy losses. The Trumps’ crypto activities have generated more than $1bn in pre-tax profits, a recent investigation found.`
  }
];

class MockDbService {
  private readonly STORAGE_KEY = 'dwa_admin_db_v4'; 
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: ((status: ConnectionStatus) => void)[] = [];

  constructor() {
    this.initBootstrap();
    this.simulateConnectionCycle();
  }

  private initBootstrap() {
    const records = this.getRecords();
    if (records.length === 0) {
      const now = Date.now();
      const bootstrapRecords: DbRecord[] = BOOTSTRAP_ITEMS.map((item, index) => ({
        ...item,
        timestamp: now - (index * 1000), // Spaced by 1s to maintain order at the top
        synced: true
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bootstrapRecords));
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

  public async promoteRecord(id: string): Promise<void> {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === id);
    if (index > -1) {
      records[index].timestamp = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    }
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