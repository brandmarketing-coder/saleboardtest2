import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PenTool } from 'lucide-react';
import SalesDashboard from './components/SalesDashboard';
import DataInput from './components/DataInput';
import { PALETTE } from './constants';
import { SalesData } from './types';

// =========================================================================================
// GOOGLE SHEET 設定區
// 若要連結 Google Sheet，請將您部署的 Web App URL 填入下方變數
// 範例: const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/xxxxxxxxx/exec";
// =========================================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_ijNH2_T8WOZxhunsH68R8Zuv0a09AyI4rM-JK4k3s1-1lwPSZv_eVybJKX0qyv0uMw/exec"; 

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'dashboard'>('input');
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化載入資料
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (GOOGLE_SCRIPT_URL) {
        // Mode A: Google Sheet Mode
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const result = await response.json();
        // Assume Google Script returns { data: [...] }
        if (result.status === 'success') {
          setData(result.data);
        }
      } else {
        // Mode B: Local Mock Mode
        const localData = localStorage.getItem('morandi_sales_data');
        if (localData) {
          setData(JSON.parse(localData));
        } else {
            // Initial Demo Data if empty
            // setData([]); 
        }
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveData = async (newData: Omit<SalesData, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    const timestamp = new Date(newData.日期).getTime();
    const entry: SalesData = {
      ...newData,
      id: crypto.randomUUID(),
      timestamp
    };

    try {
      if (GOOGLE_SCRIPT_URL) {
        // Send to Google Sheet
        // Note: Google Apps Script Web App typically requires 'no-cors' for simple POST from browser, 
        // or formatting data as query params for GET if CORS issues arise. 
        // Best practice: send JSON stringified in body (requires handling OPTIONS in GAS).
        
        // Simulating a POST for now using the fetch API logic you'd use
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for GAS
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry)
        });
        
        // Re-fetch to get updated state (or optimistically update)
        await fetchData();

      } else {
        // Local Storage Mode
        const updatedData = [...data, entry];
        setData(updatedData);
        localStorage.setItem('morandi_sales_data', JSON.stringify(updatedData));
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Save failed", error);
      alert("儲存失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = (importedData: SalesData[]) => {
    const updatedData = [...data, ...importedData];
    // Remove duplicates based on ID if needed, or simple append
    setData(updatedData);
    if (!GOOGLE_SCRIPT_URL) {
        localStorage.setItem('morandi_sales_data', JSON.stringify(updatedData));
    }
    alert(`成功匯入 ${importedData.length} 筆資料！`);
  };

  return (
    <div className="min-h-screen font-sans transition-colors duration-500" style={{ backgroundColor: PALETTE.background }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1.5 rounded-full shadow-sm border border-[#E6E2DE] inline-flex">
            <button
              onClick={() => setActiveTab('input')}
              className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'input'
                  ? `bg-[${PALETTE.primary}] text-white shadow-md`
                  : 'text-[#8D7868] hover:bg-[#F9F8F6]'
              }`}
              style={activeTab === 'input' ? { backgroundColor: PALETTE.primary } : {}}
            >
              <PenTool size={16} />
              資料輸入
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'dashboard'
                  ? `bg-[${PALETTE.primary}] text-white shadow-md`
                  : 'text-[#8D7868] hover:bg-[#F9F8F6]'
              }`}
              style={activeTab === 'dashboard' ? { backgroundColor: PALETTE.primary } : {}}
            >
              <LayoutDashboard size={16} />
              監測儀表板
            </button>
          </div>
        </div>

        {/* Content Area */}
        <main>
          {activeTab === 'input' ? (
            <DataInput onSave={handleSaveData} isLoading={isLoading} />
          ) : (
            <SalesDashboard 
                externalData={data} 
                onImportData={handleImportData} 
                onRefresh={fetchData}
                isLoading={isLoading}
            />
          )}
        </main>

        {/* Footer/Info */}
        <footer className="mt-20 text-center text-[#8D7868]/40 text-xs">
            <p>Morandi Sales Station • {GOOGLE_SCRIPT_URL ? 'Connected to Google Sheets' : 'Local Mode'}</p>
        </footer>
      </div>
    </div>
  );
}

export default App;