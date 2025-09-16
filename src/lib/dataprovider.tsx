
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, Account, OrderSellOut, Interaction, Stage, AccountType, SantaData } from '@/domain/ssot';

export type DataMode = 'test' | 'real';


function processRawData(data: any[]): SantaData {
  const accountsMap = new Map<string, Account>();
  const ordersMap = new Map<string, OrderSellOut>();
  const interactionsMap = new Map<string, Interaction>();

  const nameToId: Record<string, string> = {
      'patxi': 'u_patxi',
      'nico': 'u_nico',
      'alfonso': 'u_alfonso',
      'martin': 'u_martin',
      'ana': 'u_ana',
      'marcos': 'u_marcos',
      'sofia': 'u_sofia',
      'miguel': 'u_miguel',
      'annso': 'u_annso',
  };

  const getUserIdFromName = (name: string): string => {
      const normalizedName = (name || '').toLowerCase();
      return nameToId[normalizedName] || 'u_admin';
  };

  const toValidStage = (stage: string): Stage => {
    const upperStage = (stage || '').toUpperCase();
    if (['ACTIVA', 'SEGUIMIENTO', 'POTENCIAL', 'FALLIDA'].includes(upperStage)) {
      return upperStage as Stage;
    }
    switch(upperStage) {
        case 'CLOSED / WON': return 'ACTIVA';
        case 'NEGOTATION':
        case 'SCHEDULE APPOINTMENT':
        case 'CONTACT NEXT SEASON': return 'SEGUIMIENTO';
        case 'INTERESTED':
        case 'CONTACTED': return 'POTENCIAL';
        default: return 'POTENCIAL';
    }
  };
  
  const toValidType = (type: string): AccountType => {
      const upperType = (type || '').toUpperCase();
      if (['HORECA', 'RETAIL', 'DISTRIBUIDOR', 'IMPORTADOR', 'OTRO'].includes(upperType)) {
          return upperType as AccountType;
      }
      return 'HORECA'; 
  };

  data.forEach(row => {
    const accountId = row.accountId || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (row.accountName && !accountsMap.has(accountId)) {
      const ownerId = getUserIdFromName(row.responsible);
      
      const account: Account = {
        id: accountId,
        name: row.accountName,
        city: row.accountCity,
        stage: toValidStage(row.accountStage),
        type: toValidType(row.accountType),
        mode: { mode: 'COLOCACION', ownerUserId: ownerId, billerPartnerId: 'd_rivera' },
        salesRepId: ownerId,
        distributorId: row.distributorId || 'd_rivera',
        lastInteractionAt: row.lastInteractionAt || undefined,
        createdAt: new Date().toISOString(),
        phone: row.contactPhone || undefined,
        cif: undefined,
        tags: [],
        address: row.address || undefined
      };
      accountsMap.set(accountId, account);
    }
    
    const currentAccount = accountsMap.get(accountId);
    if (row.orderId && (row.itemSku || row['750 CASES'] || row['750 BOTTLE'])) {
        if (!ordersMap.has(row.orderId)) {
             const statusStr = (row.orderStatus || '').toLowerCase();
             let status: OrderSellOut['status'] = 'open';
             if (['confirmed', 'confirmado', 'pagado', 'facturado', 'completado'].includes(statusStr)) {
                 status = 'confirmed';
             } else if (['lost', 'fallido'].includes(statusStr)) {
                 status = 'lost';
             }
             const responsibleId = getUserIdFromName(row.responsible);
             ordersMap.set(row.orderId, {
                id: row.orderId,
                accountId: accountId,
                userId: responsibleId,
                status: status,
                currency: 'EUR',
                createdAt: row.orderDate || new Date().toISOString(),
                lines: [],
                notes: row.orderNotes || row.COMMENTS || undefined
             });
        }
        const order = ordersMap.get(row.orderId)!;
        const caseQty = parseFloat(row['750 CASES'] || row.itemQty || 0);
        const bottleQty = parseFloat(row['750 BOTTLE'] || 0);
        
        let qty = 0;
        let unit: 'caja' | 'ud' = 'caja';
        if (caseQty > 0) {
            qty = caseQty;
            unit = 'caja';
        } else if (bottleQty > 0) {
            qty = bottleQty;
            unit = 'ud';
        }

        if (qty > 0) {
             const price = parseFloat(String(row.PRICE || row.itemUnitPrice || '0').replace('€','').replace(',',''));
             order.lines.push({
                sku: 'SB-750', // Asumido
                qty: qty,
                unit: unit,
                priceUnit: (price / qty) || 0,
            });
        }
    }

    const interactionId = row.orderId || `int_${accountId}_${row.lastInteractionAt || row.DATE || Date.now()}`;
    if (!interactionsMap.has(interactionId)) {
        const interaction: Interaction = {
            id: interactionId,
            accountId: accountId,
            userId: currentAccount ? (currentAccount.salesRepId || 'u_admin') : 'u_admin',
            kind: row.orderId ? 'OTRO' : 'LLAMADA',
            note: row.orderNotes || row.COMMENTS || `Estado: ${row.orderStatus || row.STATUS}`,
            createdAt: row.lastInteractionAt || row.orderDate || row.DATE || new Date().toISOString(),
            dept: 'VENTAS'
        };
        interactionsMap.set(interactionId, interaction);
    }
  });

  return {
    ...({} as SantaData), // Start with an empty base
    accounts: Array.from(accountsMap.values()),
    ordersSellOut: Array.from(ordersMap.values()),
    interactions: Array.from(interactionsMap.values()),
    // Populate other fields from a base mock if needed, or leave them empty
    users: [], products: [], materials: [], distributors: [], billOfMaterials: [], productionOrders: [], lots: [], qaChecks: [], inventory: [], goodsReceipts: [], suppliers: [], traceEvents: [], priceLists: [], nonConformities: [], stockMoves: [], shipments: [], supplierBills: [], payments: [], mktEvents: [], onlineCampaigns: [], activations: [], creators: [], influencerCollabs: [], batches: [], packRuns: [], trace: [], qcTests: [], purchaseOrders: [], receipts: [],
  };
}


let RealSantaData: SantaData | null = null;
let MockSantaData: SantaData | null = null;

interface DataContextProps {
  mode: DataMode;
  setMode: React.Dispatch<React.SetStateAction<DataMode>>;
  data: SantaData | null;
  setData: (data: SantaData) => void;
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DataMode>('test');
  const [data, setDataState] = useState<SantaData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial user/mode load
  const [isDataLoading, setIsDataLoading] = useState(true); // For async data fetching

  useEffect(() => {
    const savedMode = localStorage.getItem('sb-data-mode') as DataMode;
    if (savedMode) setMode(savedMode);
    
    try {
        const savedUser = localStorage.getItem('sb-current-user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
    } catch(e) {
        console.error("Could not parse user from localStorage", e);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('sb-data-mode', mode);
    setIsDataLoading(true);

    const loadData = async () => {
        try {
            if (mode === 'test') {
                if (MockSantaData) {
                    setDataState(MockSantaData);
                } else {
                    const module = await import('@/domain/mock-data');
                    MockSantaData = module.mockSantaData;
                    setDataState(MockSantaData);
                }
            } else { // mode === 'real'
                if (RealSantaData) {
                    setDataState(RealSantaData);
                } else {
                    const module = await import('./real-data.json');
                    const mockModule = await import('@/domain/mock-data');
                    // Process raw data and merge with base structure from mock
                    const processed = processRawData(module.default);
                    RealSantaData = {
                        ...mockModule.mockSantaData, // Base structure, users, etc.
                        accounts: processed.accounts,
                        ordersSellOut: processed.ordersSellOut,
                        interactions: processed.interactions,
                    };
                    setDataState(RealSantaData);
                }
            }
        } catch (err) {
            console.error(`Failed to load data for mode "${mode}":`, err);
            // Fallback to mock data if real fails
            if (!MockSantaData) {
                 const module = await import('@/domain/mock-data');
                 MockSantaData = module.mockSantaData;
            }
            setDataState(MockSantaData);
        } finally {
            setIsDataLoading(false);
        }
    };
    
    loadData();

  }, [mode]);
  
  useEffect(() => {
    if (mode === 'real' && data) {
       localStorage.setItem('sb-real-data', JSON.stringify(data));
    }
  }, [data, mode]);

  const setData = useCallback((newData: SantaData) => {
    if (mode === 'real') {
      RealSantaData = newData;
    } else {
      MockSantaData = newData;
    }
    setDataState(newData);
  }, [mode]);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
      // Data for the current mode should already be loading/loaded via useEffect
      const userSource = (data?.users) || [];
      const user = userSource.find(u => u.email === email);
      
      if (user) {
          setCurrentUser(user);
          localStorage.setItem('sb-current-user', JSON.stringify(user));
          return true;
      }
      return false;

  }, [data]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('sb-current-user');
  }, []);

  const value = useMemo(() => ({ 
      mode, 
      setMode, 
      data, 
      setData,
      currentUser,
      login,
      logout,
      isLoading: isLoading || isDataLoading
  }), [mode, data, setData, currentUser, login, logout, isLoading, isDataLoading]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
