export interface OrderRow {
  "Ngày đơn hàng": string | number | Date;
  "Mã nhà thuốc": string;
  "Tên nhà thuốc": string;
  "Mã sản phẩm": string;
  "Tên sản phẩm": string;
  "Doanh số": number;
}

export interface ProductRow {
  "Mã sản phẩm": string;
  "Tên sản phẩm": string;
  "Số điểm": number;
}

export interface ContractRow {
  "Mã nhà thuốc": string;
  "Tên nhà thuốc": string;
  "Ngày đăng ký hợp đồng": string | number | Date;
  "Mức điểm cam kết": number;
}

export interface CalculationResult {
  pharmacyCode: string;
  pharmacyName: string;
  contractDate: string;
  totalPoints: number;
  committedPoints: number;
  status: string;
  revenue5: number;
  revenue3: number;
}

export interface ProcessingStats {
  totalContracts: number;
  totalValidOrders: number;
  rejectedNoPoints: number;
  rejectedBeforeContract: number;
  totalNonContractPharmacies: number;
}

export interface ValidationError {
  file: string;
  message: string;
  type: 'error' | 'warning';
}
