import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Upload, FileSpreadsheet, Calendar, DollarSign, Package, TrendingUp, AlertCircle, Layers, Tag, ChevronDown, RefreshCw
} from 'lucide-react';
import { SalesData, DateRange } from '../types';
import { PALETTE, CHART_COLORS } from '../constants';
import Button from './Button';

// ----------------------------------------------------------------------
// 輔助函式
// ----------------------------------------------------------------------

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(num);
};

const getWeekString = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
  return `${year}-W${weekNo}`;
};

const getMonthString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// ----------------------------------------------------------------------
// 組件介面
// ----------------------------------------------------------------------

interface SalesDashboardProps {
    externalData: SalesData[];
    onImportData: (data: SalesData[]) => void;
    onRefresh: () => void;
    isLoading: boolean;
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ externalData, onImportData, onRefresh, isLoading }) => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isGroupByCategory, setIsGroupByCategory] = useState<boolean>(false);

  // Initialize date range when data loads
  useEffect(() => {
    if (externalData.length > 0 && !dateRange.start) {
        const sorted = [...externalData].sort((a, b) => a.timestamp - b.timestamp);
        setDateRange({
            start: sorted[0].日期,
            end: sorted[sorted.length - 1].日期
        });
    }
  }, [externalData]);

  useEffect(() => {
    // Check if script is already there
    if (document.querySelector('script[src*="xlsx.full.min.js"]')) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isScriptLoaded) {
      setErrorMsg('系統初始化中...請稍後再試');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSX = window.XLSX;
        if (!XLSX) {
            setErrorMsg('Excel 解析庫載入失敗');
            return;
        }

        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length > 0) {
          const firstRow = data[0] as any;
          const requiredKeys = ['日期', '類別', '品名', '數量', '銷售金額'];
          const missingKeys = requiredKeys.filter(key => !(key in firstRow));
          
          if (missingKeys.length > 0) {
            setErrorMsg(`缺少欄位：${missingKeys.join(', ')}`);
            return;
          }

          const formattedData: SalesData[] = data.map((row: any, index: number) => {
            let dateStr = row['日期'];
            let timestamp = 0;

            if (typeof dateStr === 'number') {
              const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
              dateStr = dateObj.toISOString().split('T')[0];
              timestamp = dateObj.getTime();
            } else {
              const dateObj = new Date(dateStr);
              if (!isNaN(dateObj.getTime())) {
                dateStr = dateObj.toISOString().split('T')[0];
                timestamp = dateObj.getTime();
              }
            }

            return {
              id: `excel-${Date.now()}-${index}`, // Unique ID
              日期: dateStr,
              類別: String(row['類別']),
              品名: String(row['品名']),
              數量: Number(row['數量']) || 0,
              銷售金額: Number(row['銷售金額']) || 0,
              timestamp
            };
          }).filter((item: SalesData) => item.timestamp > 0);

          if (formattedData.length > 0) {
             onImportData(formattedData);
          } else {
            setErrorMsg('檔案中沒有有效的銷售數據');
          }
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('無法解析檔案，請確認格式。');
      }
    };
    reader.readAsBinaryString(file);
  };

  const { allProducts, allCategories } = useMemo(() => {
    const products = new Set<string>();
    const categories = new Set<string>();
    externalData.forEach(d => {
      products.add(d.品名);
      categories.add(d.類別);
    });
    return {
      allProducts: Array.from(products).sort(),
      allCategories: Array.from(categories).sort()
    };
  }, [externalData]);

  const processedData = useMemo(() => {
    if (externalData.length === 0) return null;
    if (!dateRange.start || !dateRange.end) return null;

    const startTs = new Date(dateRange.start).getTime();
    const endTs = new Date(dateRange.end).getTime(); 

    if (isNaN(startTs) || isNaN(endTs)) return null;

    const filtered = externalData.filter(d => {
      const currentTs = d.timestamp;
      const bufferEnd = endTs + 86400000;
      const dateMatch = currentTs >= startTs && currentTs < bufferEnd;
      const productMatch = selectedProduct === 'all' || d.品名 === selectedProduct;
      return dateMatch && productMatch;
    });

    // Check if filtering resulted in empty set
    if (filtered.length === 0) return {
        filteredRaw: [],
        totalSales: 0,
        totalQty: 0,
        topProduct: '-',
        trendData: [],
        categoryData: []
    };

    const totalSales = filtered.reduce((acc, curr) => acc + curr.銷售金額, 0);
    const totalQty = filtered.reduce((acc, curr) => acc + curr.數量, 0);
    
    const productSales: Record<string, number> = {};
    filtered.forEach(d => {
      productSales[d.品名] = (productSales[d.品名] || 0) + d.銷售金額;
    });
    let topProduct = '-';
    let maxSale = 0;
    Object.entries(productSales).forEach(([name, sale]) => {
      if (sale > maxSale) {
        maxSale = sale;
        topProduct = name;
      }
    });

    const trendMap: Record<string, any> = {};
    
    filtered.forEach(d => {
      let key = d.日期;
      if (viewMode === 'week') {
        key = getWeekString(new Date(d.timestamp));
      } else if (viewMode === 'month') {
        key = getMonthString(new Date(d.timestamp));
      }

      if (!trendMap[key]) {
        trendMap[key] = { date: key, amount: 0, qty: 0 };
        if (isGroupByCategory) {
            allCategories.forEach(c => trendMap[key][c] = 0);
        }
      }

      trendMap[key].amount += d.銷售金額;
      trendMap[key].qty += d.數量;
      
      if (isGroupByCategory) {
        trendMap[key][d.類別] = (trendMap[key][d.類別] || 0) + d.銷售金額;
      }
    });
    
    const trendData = Object.values(trendMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const categoryMap: Record<string, number> = {};
    filtered.forEach(d => {
      categoryMap[d.類別] = (categoryMap[d.類別] || 0) + d.銷售金額;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    return {
      filteredRaw: filtered,
      totalSales,
      totalQty,
      topProduct,
      trendData,
      categoryData
    };

  }, [externalData, dateRange, viewMode, selectedProduct, isGroupByCategory, allCategories]);

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E6E2DE] pb-6">
            <div>
                <h2 className="text-2xl font-serif text-[#2C3E50]">即時銷售看板</h2>
                <p className="text-[#8D7868] text-sm">Real-time Sales Analytics</p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={onRefresh} className="bg-white" disabled={isLoading}>
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    同步資料
                </Button>
                <div className="relative group">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        disabled={!isScriptLoaded}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <Button variant="ghost" disabled={!isScriptLoaded} className="border border-[#E6E2DE] bg-white">
                        <FileSpreadsheet size={16} />
                        匯入舊檔
                    </Button>
                </div>
            </div>
        </div>

        {errorMsg && (
          <div className="bg-[#FDF2F2] text-[#C45C5C] p-4 rounded-lg flex items-center gap-2 border border-[#C45C5C]/20 animate-pulse">
            <AlertCircle size={20} />
            {errorMsg}
          </div>
        )}

        {processedData && processedData.filteredRaw.length > 0 ? (
          <div className="space-y-8">
            
            {/* 1. 篩選與控制列 (懸浮玻璃質感) */}
            <div className="sticky top-4 z-20 backdrop-blur-md bg-white/80 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 flex flex-col xl:flex-row gap-6 items-center justify-between transition-all">
              
              <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
                {/* 日期選擇器 */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-[#E6E2DE] shadow-sm">
                  <Calendar size={18} className="text-[#D4AF37]" />
                  <div className="flex items-center gap-2 text-sm">
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="bg-transparent border-none focus:ring-0 text-[#2C3E50] p-0 font-medium font-sans outline-none"
                    />
                    <span className="text-[#E6E2DE]">|</span>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="bg-transparent border-none focus:ring-0 text-[#2C3E50] p-0 font-medium font-sans outline-none"
                    />
                  </div>
                </div>

                {/* 品項篩選 */}
                <div className="relative group min-w-[200px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">
                    <Tag size={16} />
                  </div>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E6E2DE] rounded-xl text-sm font-medium text-[#2C3E50] appearance-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all shadow-sm cursor-pointer outline-none"
                  >
                    <option value="all">所有品項</option>
                    {allProducts.map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D7868] pointer-events-none">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">
                 {/* 分組開關 */}
                 <button
                    onClick={() => setIsGroupByCategory(!isGroupByCategory)}
                    className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                      isGroupByCategory 
                        ? 'text-white border-[#2C3E50]' 
                        : 'bg-transparent text-[#8D7868] border-[#E6E2DE] hover:border-[#8D7868]'
                    }`}
                    style={isGroupByCategory ? { backgroundColor: PALETTE.primary } : {}}
                  >
                    {isGroupByCategory && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4AF37] rounded-full animate-pulse"></span>}
                    類別堆疊
                  </button>

                {/* 檢視切換 */}
                <div className="flex bg-[#F0EFED] p-1 rounded-full border border-[#E6E2DE]">
                  {['day', 'week', 'month'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode as any)}
                      className={`px-6 py-1.5 text-sm font-medium rounded-full transition-all duration-300 ${
                        viewMode === mode 
                          ? 'bg-white text-[#2C3E50] shadow-md shadow-gray-200' 
                          : 'text-[#8D7868] hover:text-[#2C3E50]'
                      }`}
                    >
                      {mode === 'day' ? '日' : mode === 'week' ? '週' : '月'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. KPI 區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: '總銷售額', value: formatCurrency(processedData.totalSales), icon: DollarSign, color: '#C45C5C', label: 'Total Revenue' },
                { title: '銷售總量', value: processedData.totalQty.toLocaleString(), icon: Package, color: '#5F8D9E', label: 'Total Quantity', unit: '件' },
                { title: selectedProduct !== 'all' ? '當前商品' : '熱銷冠軍', value: selectedProduct !== 'all' ? selectedProduct : processedData.topProduct, icon: TrendingUp, color: '#D4AF37', label: 'Top Performer' }
              ].map((kpi, idx) => (
                <div key={idx} className="relative overflow-hidden bg-white p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white group hover:-translate-y-1 transition-transform duration-300">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150 group-hover:scale-125 duration-500">
                    <kpi.icon size={120} color={kpi.color} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                            <kpi.icon size={16} color={kpi.color} />
                        </div>
                        <span className="text-xs font-bold tracking-widest text-[#8D7868] uppercase">{kpi.label}</span>
                    </div>
                    <h3 className="text-3xl font-serif font-medium text-[#2C3E50] tracking-tight">
                        {kpi.value}
                        {kpi.unit && <span className="text-lg font-sans text-[#8D7868] ml-2 font-normal">{kpi.unit}</span>}
                    </h3>
                    <p className="text-sm text-[#8D7868]/80 mt-1 font-light">{kpi.title}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. 圖表區 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 趨勢圖 */}
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h3 className="text-xl font-serif text-[#2C3E50]">銷售趨勢分析</h3>
                        <p className="text-sm text-[#8D7868] mt-1 font-light">
                            {isGroupByCategory ? '各類別銷售堆疊圖' : '整體營收走勢'}
                        </p>
                    </div>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFED" />
                      <XAxis 
                        dataKey="date" 
                        tick={{fill: '#8D7868', fontSize: 12, fontFamily: 'sans-serif'}} 
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis 
                        tick={{fill: '#8D7868', fontSize: 12, fontFamily: 'sans-serif'}} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${val/1000}k`}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            padding: '12px 16px',
                            fontFamily: 'sans-serif'
                        }}
                        cursor={{fill: '#F9F8F6'}}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={48} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#8D7868' }}
                      />
                      
                      {isGroupByCategory ? (
                          allCategories.map((cat, index) => (
                              <Bar 
                                key={cat} 
                                dataKey={cat} 
                                name={cat} 
                                stackId="a" 
                                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                radius={[0, 0, 0, 0]}
                                barSize={viewMode === 'day' ? 20 : 40}
                              />
                          ))
                      ) : (
                          <Bar 
                            dataKey="amount" 
                            name="銷售金額" 
                            fill={CHART_COLORS[2]} // #5F8D9E
                            radius={[4, 4, 0, 0]}
                            barSize={viewMode === 'day' ? 20 : 40}
                          />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 圓餅圖 */}
              <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white flex flex-col">
                <div className="mb-4">
                    <h3 className="text-xl font-serif text-[#2C3E50]">類別占比</h3>
                    <p className="text-sm text-[#8D7868] mt-1 font-light">銷售金額分佈</p>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedData.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {processedData.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)} 
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#8D7868' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. 資料列表 - 極簡線條風格 */}
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white overflow-hidden">
              <div className="p-8 pb-4 border-b border-[#F0EFED] flex justify-between items-center">
                <h3 className="text-xl font-serif text-[#2C3E50]">最新明細</h3>
                <span className="text-xs bg-[#F9F8F6] text-[#8D7868] px-3 py-1 rounded-full">{processedData.filteredRaw.length} 筆資料</span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-sm text-[#8D7868]">
                  <thead className="bg-[#F9F8F6] text-[#2C3E50] font-medium sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-4 font-serif">日期</th>
                      <th className="px-8 py-4 font-serif">類別</th>
                      <th className="px-8 py-4 font-serif">品名</th>
                      <th className="px-8 py-4 text-right font-serif">數量</th>
                      <th className="px-8 py-4 text-right font-serif">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFED]">
                    {processedData.filteredRaw.sort((a,b) => b.timestamp - a.timestamp).slice(0, 100).map((row) => (
                      <tr key={row.id} className="hover:bg-[#F9F8F6] transition-colors group">
                        <td className="px-8 py-4 font-medium">{row.日期}</td>
                        <td className="px-8 py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-xs border border-[#E6E2DE] text-[#5D6D7E] group-hover:bg-white transition-colors">
                            {row.類別}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-[#2C3E50]">{row.品名}</td>
                        <td className="px-8 py-4 text-right">{row.數量}</td>
                        <td className="px-8 py-4 text-right font-medium text-[#2C3E50]">{formatCurrency(row.銷售金額)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* 空狀態 - 引導去輸入 */
          <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-[#E6E2DE] p-12 text-center">
             <div className="w-20 h-20 bg-[#F9F8F6] rounded-full flex items-center justify-center mb-6">
                <Package size={32} color={PALETTE.primary} />
            </div>
            <h3 className="text-2xl font-serif text-[#2C3E50] mb-3">尚無銷售數據</h3>
            <p className="text-[#8D7868] mb-8 max-w-md font-light">
              您可以切換至「輸入頁」新增資料，或點擊上方匯入舊 Excel 檔案。
            </p>
          </div>
        )}
    </div>
  );
};

export default SalesDashboard;