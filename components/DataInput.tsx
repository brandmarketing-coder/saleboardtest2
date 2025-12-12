import React, { useState } from 'react';
import { Plus, Save, RefreshCw } from 'lucide-react';
import Button from './Button';
import { SalesData } from '../types';

interface DataInputProps {
  onSave: (data: Omit<SalesData, 'id' | 'timestamp'>) => Promise<void>;
  isLoading: boolean;
}

// 定義商品與類別對應表
const PRODUCT_DATA: Record<string, string[]> = {
  "洗髮露": [
    "強健頭皮洗髮露500ml",
    "豐盈彈韌洗髮露500ml",
    "結構修護洗髮露500ml",
    "染燙護色洗髮露500ml",
    "濃縮咖啡因養髮洗髮露500mL"
  ],
  "養髮液": [
    "咖啡因養髮液100ml_PRO",
    "咖啡因麥拉寧養髮液100ml_PRO",
    "女士養髮液70ml",
    "男士養髮液70ml"
  ],
  "居家保養": [
    "豐盈彈韌精華油70ml",
    "豐盈彈韌調理精華220ml",
    "結構修護精華乳70ml",
    "染燙護色精華油70ml"
  ],
  "洗髮精": [
    "香檸草修護洗髮精2L_3入",
    "木蘭保濕洗髮精2L_3入",
    "薔薇護色洗髮精2L_3入",
    "雪松橙控油洗髮精2L_3入",
    "薰衣草深層洗髮精2L_3入"
  ]
};

const CATEGORIES = Object.keys(PRODUCT_DATA);

export default function DataInput({ onSave, isLoading }: DataInputProps) {
  // 取得當地時間的 YYYY-MM-DD 格式
  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [formData, setFormData] = useState({
    date: getTodayString(),
    category: CATEGORIES[0],
    product: PRODUCT_DATA[CATEGORIES[0]][0],
    quantity: 1,
    amount: 0
  });

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product || formData.amount <= 0) {
      setNotification({ message: '請填寫完整的商品名稱與金額', type: 'error' });
      return;
    }

    try {
      await onSave({
        日期: formData.date,
        類別: formData.category,
        品名: formData.product,
        數量: Number(formData.quantity),
        銷售金額: Number(formData.amount)
      });
      
      setNotification({ message: '資料儲存成功！', type: 'success' });
      
      // 重置邏輯：保留日期與類別，重置其他
      setFormData(prev => ({
        ...prev,
        product: PRODUCT_DATA[prev.category][0],
        quantity: 1,
        amount: 0
      }));

      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({ message: '儲存失敗，請稍後再試', type: 'error' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'category') {
        // 類別變更時，重置該類別對應的第一個產品
        setFormData(prev => ({
            ...prev,
            category: value,
            product: PRODUCT_DATA[value] ? PRODUCT_DATA[value][0] : ''
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-[slideUp_0.5s_ease-out]">
      <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#F9F8F6] rounded-full flex items-center justify-center mx-auto mb-4 text-[#D4AF37]">
            <Plus size={32} />
          </div>
          <h2 className="text-3xl font-serif text-[#2C3E50]">新增銷售紀錄</h2>
          <p className="text-[#8D7868] mt-2 font-light">輸入即時數據，同步更新至儀表板</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 日期與類別 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-[#8D7868] uppercase ml-1">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F9F8F6] border-none rounded-xl text-[#2C3E50] font-medium focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all cursor-pointer"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-[#8D7868] uppercase ml-1">Category</label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#F9F8F6] border-none rounded-xl text-[#2C3E50] font-medium focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8D7868]">▼</div>
              </div>
            </div>
          </div>

          {/* 品名 (連動下拉選單) */}
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-widest text-[#8D7868] uppercase ml-1">Product Name</label>
            <div className="relative">
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#F9F8F6] border-none rounded-xl text-[#2C3E50] font-medium focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  {PRODUCT_DATA[formData.category] && PRODUCT_DATA[formData.category].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8D7868]">▼</div>
            </div>
          </div>

          {/* 數量與金額 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-[#8D7868] uppercase ml-1">Quantity</label>
              <input
                type="number"
                name="quantity"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F9F8F6] border-none rounded-xl text-[#2C3E50] font-medium focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-[#8D7868] uppercase ml-1">Total Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D7868]">$</span>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 bg-[#F9F8F6] border-none rounded-xl text-[#2C3E50] font-medium focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* 通知訊息 */}
          {notification && (
            <div className={`p-3 rounded-lg text-sm text-center animate-[fadeIn_0.3s] ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {notification.message}
            </div>
          )}

          <div className="pt-4">
            <Button type="submit" variant="gold" className="w-full py-4 text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  處理中...
                </>
              ) : (
                <>
                  <Save size={20} />
                  確認儲存
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}