import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Calculator, 
  Download, 
  Trash2,
  Info,
  BarChart3,
  Search,
  ArrowRight,
  HelpCircle,
  FileDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { 
  OrderRow, 
  ProductRow, 
  ContractRow, 
  CalculationResult, 
  ProcessingStats, 
  ValidationError 
} from '@/src/types';
import { generateSampleFiles } from '@/src/lib/sampleData';

// Utility to parse Excel dates
const parseExcelDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  // If it's already a Date object (from xlsx cellDates: true)
  if (dateValue instanceof Date) {
    // Excel dates from cellDates: true can sometimes have a timezone offset issue.
    // We force it to midnight UTC of that same day to be safe.
    return new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()));
  }
  
  if (typeof dateValue === 'number') {
    // Excel serial date to UTC Date
    // 25569 is the epoch difference between Excel and JS
    // We add a small epsilon (0.0001) to handle floating point precision issues
    const date = new Date(Math.round((dateValue - 25569 + 0.00001) * 86400 * 1000));
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  
  if (typeof dateValue === 'string') {
    const parts = dateValue.split(/[\/\-]/);
    if (parts.length === 3) {
      // Prioritize MM/DD/YYYY as requested (e.g., 03-15-2026)
      const m = parseInt(parts[0], 10) - 1;
      const d = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      // Create as UTC midnight to avoid timezone shifts
      const date = new Date(Date.UTC(y, m, d));
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
};

const formatDateToString = (date: Date | null): string => {
  if (!date) return '';
  
  // Create a copy and add 1 day as requested by the user to fix the display offset
  const adjustedDate = new Date(date.getTime());
  adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 1);
  
  const m = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(adjustedDate.getUTCDate()).padStart(2, '0');
  const y = adjustedDate.getUTCFullYear();
  return `${m}/${d}/${y}`;
};

export default function App() {
  const [orderData, setOrderData] = useState<OrderRow[]>([]);
  const [productData, setProductData] = useState<ProductRow[]>([]);
  const [contractData, setContractData] = useState<ContractRow[]>([]);
  
  const [fileNames, setFileNames] = useState({
    orders: '',
    products: '',
    contracts: ''
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const sampleFiles = generateSampleFiles();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'orders' | 'products' | 'contracts') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileNames(prev => ({ ...prev, [type]: file.name }));
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (type === 'orders') setOrderData(data);
        if (type === 'products') setProductData(data);
        if (type === 'contracts') setContractData(data);
        
        // Clear previous results when new files are uploaded
        setResults([]);
        setStats(null);
      } catch (err) {
        setErrors(prev => [...prev, { file: file.name, message: 'Không thể đọc file Excel. Vui lòng kiểm tra định dạng.', type: 'error' }]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateFiles = () => {
    const newErrors: ValidationError[] = [];
    
    if (orderData.length > 0) {
      const required = ["Ngày đơn hàng", "Mã nhà thuốc", "Tên nhà thuốc", "Mã sản phẩm", "Tên sản phẩm", "Doanh số"];
      const keys = Object.keys(orderData[0]);
      required.forEach(col => {
        if (!keys.includes(col)) newErrors.push({ file: 'File Đơn hàng', message: `Thiếu cột bắt buộc: ${col}`, type: 'error' });
      });
    }

    if (productData.length > 0) {
      const required = ["Mã sản phẩm", "Tên sản phẩm", "Số điểm"];
      const keys = Object.keys(productData[0]);
      required.forEach(col => {
        if (!keys.includes(col)) newErrors.push({ file: 'File Danh mục sản phẩm', message: `Thiếu cột bắt buộc: ${col}`, type: 'error' });
      });
    }

    if (contractData.length > 0) {
      const required = ["Mã nhà thuốc", "Tên nhà thuốc", "Ngày đăng ký hợp đồng", "Mức điểm cam kết"];
      const keys = Object.keys(contractData[0]);
      required.forEach(col => {
        if (!keys.includes(col)) newErrors.push({ file: 'File Hợp đồng', message: `Thiếu cột bắt buộc: ${col}`, type: 'error' });
      });
    }

    setErrors(newErrors);
    return newErrors.filter(e => e.type === 'error').length === 0;
  };

  const processData = () => {
    if (!validateFiles()) return;
    if (orderData.length === 0 || productData.length === 0 || contractData.length === 0) {
      setErrors(prev => [...prev, { file: 'Hệ thống', message: 'Vui lòng upload đầy đủ 3 file dữ liệu.', type: 'error' }]);
      return;
    }

    setIsProcessing(true);
    
    // Use a timeout to allow UI to show loading state
    setTimeout(() => {
      const productMap = new Map<string, number>();
      productData.forEach(p => productMap.set(String(p["Mã sản phẩm"]).trim(), Number(p["Số điểm"])));

      const contractMap = new Map<string, ContractRow>();
      contractData.forEach(c => contractMap.set(String(c["Mã nhà thuốc"]).trim(), c));

      // Use a map to track all unique pharmacies from orders
      const pharmacyResults = new Map<string, { 
        name: string, 
        rev5: number, 
        rev3: number, 
        committed: number,
        hasContract: boolean,
        contractDate: string
      }>();

      // First, identify all pharmacies from the order data
      orderData.forEach(order => {
        const phCode = String(order["Mã nhà thuốc"]).trim();
        if (!pharmacyResults.has(phCode)) {
          const contract = contractMap.get(phCode);
          const cDate = contract ? parseExcelDate(contract["Ngày đăng ký hợp đồng"]) : null;
          
          pharmacyResults.set(phCode, {
            name: contract ? contract["Tên nhà thuốc"] : String(order["Tên nhà thuốc"]).trim(),
            rev5: 0,
            rev3: 0,
            committed: contract ? Number(contract["Mức điểm cam kết"]) : 0,
            hasContract: !!contract,
            contractDate: formatDateToString(cDate)
          });
        }
      });

      let validOrdersCount = 0;
      let rejectedNoPoints = 0;
      let rejectedBeforeContract = 0;
      let nonContractPharmaciesCount = 0;
      const processedNonContract = new Set<string>();

      orderData.forEach(order => {
        const pCode = String(order["Mã sản phẩm"]).trim();
        const phCode = String(order["Mã nhà thuốc"]).trim();
        const points = productMap.get(pCode);
        const contract = contractMap.get(phCode);

        // If product has no points, skip it for both types of pharmacies
        if (points === undefined || isNaN(points)) {
          rejectedNoPoints++;
          return;
        }

        // Logic for pharmacies WITH contracts: check order date vs contract date
        if (contract) {
          const orderDate = parseExcelDate(order["Ngày đơn hàng"]);
          const contractDate = parseExcelDate(contract["Ngày đăng ký hợp đồng"]);

          if (!orderDate || !contractDate || orderDate < contractDate) {
            rejectedBeforeContract++;
            return;
          }
        } else {
          // Logic for pharmacies WITHOUT contracts: count all orders
          if (!processedNonContract.has(phCode)) {
            nonContractPharmaciesCount++;
            processedNonContract.add(phCode);
          }
        }

        validOrdersCount++;
        
        const res = pharmacyResults.get(phCode)!;
        if (points === 5) res.rev5 += Number(order["Doanh số"]) || 0;
        if (points === 3) res.rev3 += Number(order["Doanh số"]) || 0;
      });

      const finalResults: CalculationResult[] = Array.from(pharmacyResults.entries()).map(([code, data]) => {
        const totalPoints = (data.rev5 / 100000) * 5 + (data.rev3 / 100000) * 3;
        return {
          pharmacyCode: code,
          pharmacyName: data.name,
          contractDate: data.contractDate,
          totalPoints,
          committedPoints: data.committed,
          status: data.hasContract ? 'Có hợp đồng' : 'Không có hợp đồng',
          revenue5: data.rev5,
          revenue3: data.rev3
        };
      });

      setResults(finalResults);
      setStats({
        totalContracts: contractData.length,
        totalValidOrders: validOrdersCount,
        rejectedNoPoints,
        rejectedBeforeContract,
        totalNonContractPharmacies: nonContractPharmaciesCount
      });
      setIsProcessing(false);
    }, 500);
  };

  const exportToExcel = () => {
    if (results.length === 0) return;

    const exportData = results.map(r => ({
      "Ngày ký hợp đồng": r.contractDate,
      "Mã nhà thuốc": r.pharmacyCode,
      "Tên nhà thuốc": r.pharmacyName,
      "Doanh số nhóm 5 điểm": r.revenue5,
      "Doanh số nhóm 3 điểm": r.revenue3,
      "Số điểm tích lũy": Number(r.totalPoints.toFixed(2)),
      "Mức điểm cam kết": r.committedPoints,
      "Trạng thái": r.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kết quả tính điểm");
    XLSX.writeFile(wb, `Ket_qua_tich_luy_2026_${new Date().getTime()}.xlsx`);
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => 
      r.pharmacyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.pharmacyCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [results, searchTerm]);

  const clearData = () => {
    setOrderData([]);
    setProductData([]);
    setContractData([]);
    setFileNames({ orders: '', products: '', contracts: '' });
    setResults([]);
    setStats(null);
    setErrors([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Calculator className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tighter text-primary">SANTAV <span className="text-secondary">TOOLS</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-full transition-all"
              title="Hướng dẫn"
            >
              <HelpCircle size={20} />
            </button>
            <button 
              onClick={clearData}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Làm mới"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden bg-emerald-500">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-green-400 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl space-y-4"
            >
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                Trade Marketing System
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-md">
                TÍNH ĐIỂM <br />
                <span className="text-white/90">TÍCH LŨY 2026</span>
              </h1>
              <p className="text-white/90 text-lg max-w-lg font-bold drop-shadow-sm">
                Hệ thống đối soát tự động dành cho nhà thuốc có ký hợp đồng cam kết doanh số với SantaV.
              </p>
              <div className="pt-4">
                <button 
                  onClick={processData}
                  disabled={isProcessing || !orderData.length || !productData.length || !contractData.length}
                  className="flex items-center gap-3 px-8 py-4 bg-white text-emerald-600 rounded-full font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition-all active:scale-95 group"
                >
                  {isProcessing ? "Đang xử lý dữ liệu..." : "Bắt đầu tính điểm ngay"}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 space-y-8">
        {/* Help Section */}
        <AnimatePresence>
          {showHelp && (
            <motion.section 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-3xl p-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Info className="text-primary" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Quy trình xử lý</h3>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "Tải lên 3 file Excel theo đúng định dạng cột.",
                      "Định dạng ngày tháng bắt buộc: MM/DD/YYYY.",
                      "Hệ thống tự động dò mã sản phẩm để lấy điểm chuẩn.",
                      "Chỉ tính các đơn hàng từ ngày ký hợp đồng trở đi.",
                      "Công thức: (Doanh số / 100.000) x Số điểm."
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">0{i+1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 p-2 rounded-lg">
                      <FileDown className="text-secondary" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Dữ liệu mẫu</h3>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Sử dụng các file mẫu dưới đây để đảm bảo cấu trúc dữ liệu chính xác nhất.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={sampleFiles.downloadOrders} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                      <FileSpreadsheet className="text-slate-300 group-hover:text-primary" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-primary">Đơn hàng</span>
                    </button>
                    <button onClick={sampleFiles.downloadProducts} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                      <FileSpreadsheet className="text-slate-300 group-hover:text-primary" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-primary">Sản phẩm</span>
                    </button>
                    <button onClick={sampleFiles.downloadContracts} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                      <FileSpreadsheet className="text-slate-300 group-hover:text-primary" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-primary">Hợp đồng</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Upload Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UploadCard 
            title="Đơn hàng" 
            description="Dữ liệu bán hàng chi tiết từ nhà thuốc"
            fileName={fileNames.orders}
            onUpload={(e) => handleFileUpload(e, 'orders')}
            icon={<FileSpreadsheet className="text-primary" />}
            color="primary"
          />
          <UploadCard 
            title="Sản phẩm" 
            description="Danh mục điểm thưởng theo mã SP"
            fileName={fileNames.products}
            onUpload={(e) => handleFileUpload(e, 'products')}
            icon={<FileSpreadsheet className="text-secondary" />}
            color="secondary"
          />
          <UploadCard 
            title="Hợp đồng" 
            description="Thông tin cam kết và ngày ký kết"
            fileName={fileNames.contracts}
            onUpload={(e) => handleFileUpload(e, 'contracts')}
            icon={<FileSpreadsheet className="text-accent" />}
            color="accent"
          />
        </section>

        {/* Errors & Warnings */}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border-l-4 border-red-500 rounded-r-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 text-red-700 font-bold mb-4">
                <AlertCircle size={24} />
                <span className="text-lg">Phát hiện lỗi dữ liệu</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-sm text-red-600 flex items-start gap-2 bg-white/50 p-2 rounded-lg">
                    <span className="font-bold shrink-0">[{err.file}]:</span> {err.message}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Stats */}
        {stats && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <StatCard label="Tổng hợp đồng" value={stats.totalContracts} icon={<CheckCircle2 className="text-primary" />} />
            <StatCard label="Đơn hàng hợp lệ" value={stats.totalValidOrders} icon={<BarChart3 className="text-secondary" />} />
            <StatCard label="Lỗi mã SP" value={stats.rejectedNoPoints} icon={<AlertCircle className="text-accent" />} />
            <StatCard label="Lỗi ngày HĐ" value={stats.rejectedBeforeContract} icon={<Info className="text-primary" />} />
            <StatCard label="NT chưa ký HĐ" value={stats.totalNonContractPharmacies} icon={<AlertCircle className="text-slate-400" />} />
          </motion.section>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">KẾT QUẢ ĐỐI SOÁT</h2>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    {results.length} Nhà thuốc
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium">Báo cáo chi tiết điểm tích lũy dựa trên doanh số thực tế.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tìm mã hoặc tên nhà thuốc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full md:w-80 transition-all"
                  />
                </div>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-full text-sm font-bold hover:bg-secondary/90 transition-all shadow-lg hover:shadow-secondary/20 active:scale-95"
                >
                  <Download size={18} />
                  Xuất Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ngày ký HĐ</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mã NT</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tên nhà thuốc</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Doanh số (5đ)</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Doanh số (3đ)</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Điểm tích lũy</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Mức cam kết</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((row, idx) => (
                    <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5 text-sm font-medium text-slate-500">{row.contractDate || '—'}</td>
                      <td className="px-8 py-5 text-sm font-mono font-bold text-slate-400 group-hover:text-primary transition-colors">{row.pharmacyCode}</td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-900">{row.pharmacyName}</td>
                      <td className="px-8 py-5 text-sm text-right text-slate-600 font-medium">{formatCurrency(row.revenue5)}</td>
                      <td className="px-8 py-5 text-sm text-right text-slate-600 font-medium">{formatCurrency(row.revenue3)}</td>
                      <td className="px-8 py-5 text-sm text-right font-black text-primary text-lg">{formatNumber(row.totalPoints)}</td>
                      <td className="px-8 py-5 text-sm text-right text-slate-600 font-bold">{formatNumber(row.committedPoints)}</td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          row.status === 'Có hợp đồng' 
                            ? "bg-secondary/10 text-secondary" 
                            : "bg-slate-100 text-slate-400"
                        )}>
                          {row.status === 'Có hợp đồng' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <Search size={48} />
                          <p className="text-lg font-bold">Không tìm thấy kết quả</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {!results.length && !isProcessing && (
          <section className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
              <div className="relative bg-white p-10 rounded-full shadow-2xl border border-slate-100">
                <FileSpreadsheet className="w-16 h-16 text-primary/30" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">SẴN SÀNG ĐỐI SOÁT</h3>
              <p className="text-slate-500 font-medium">
                Vui lòng tải lên các file dữ liệu cần thiết để hệ thống bắt đầu phân tích và tính toán điểm tích lũy cho nhà thuốc.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-white p-1.5 rounded-lg">
                <Calculator className="text-primary w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tighter">SANTAV <span className="text-secondary">TOOLS</span></span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Hệ thống quản lý và đối soát điểm tích lũy dành cho đối tác nhà thuốc của SantaV. Đảm bảo tính minh bạch và chính xác trong mọi giao dịch.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-secondary">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Về SantaV</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách đối tác</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Hỗ trợ kỹ thuật</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Câu hỏi thường gặp</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-secondary">Bản quyền</h4>
            <p className="text-sm text-slate-400">
              Phần mềm tính điểm tích lũy nhà thuốc sáng lập bởi NGUYENTHANHNGHIA.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function UploadCard({ title, description, fileName, onUpload, icon, color }: { 
  title: string, 
  description: string, 
  fileName: string, 
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  icon: React.ReactNode,
  color: 'primary' | 'secondary' | 'accent'
}) {
  const colorMap = {
    primary: 'hover:border-primary group-hover:bg-primary/5',
    secondary: 'hover:border-secondary group-hover:bg-secondary/5',
    accent: 'hover:border-accent group-hover:bg-accent/5'
  };

  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden",
      colorMap[color]
    )}>
      <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity scale-150">
        {icon}
      </div>
      <div className="flex flex-col h-full space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              color === 'primary' ? "bg-primary/10" : color === 'secondary' ? "bg-secondary/10" : "bg-accent/10"
            )}>
              {React.cloneElement(icon as React.ReactElement, { size: 20 })}
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>
        
        <div className="mt-auto">
          {fileName ? (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <FileSpreadsheet size={16} className="text-primary" />
                </div>
                <span className="text-xs font-bold text-slate-700 truncate">{fileName}</span>
              </div>
              <CheckCircle2 size={20} className="text-secondary shrink-0" />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group/label">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-slate-300 group-hover/label:text-primary mb-3 transition-colors" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/label:text-primary transition-colors">Tải file Excel</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onUpload} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-2 hover:shadow-lg transition-all">
      <div className="p-3 bg-slate-50 rounded-2xl mb-2">
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
      <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatNumber(value)}</span>
    </div>
  );
}
