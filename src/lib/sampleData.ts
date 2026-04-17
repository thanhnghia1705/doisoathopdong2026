import * as XLSX from 'xlsx';

export function generateSampleFiles() {
  // 1. Sample Orders
  const orders = [
    { "Ngày đơn hàng": "04/01/2026", "Mã nhà thuốc": "NT001", "Tên nhà thuốc": "Nhà thuốc An Bình", "Mã sản phẩm": "SP001", "Tên sản phẩm": "Sản phẩm A", "Doanh số": 500000 },
    { "Ngày đơn hàng": "04/16/2026", "Mã nhà thuốc": "NT001", "Tên nhà thuốc": "Nhà thuốc An Bình", "Mã sản phẩm": "SP001", "Tên sản phẩm": "Sản phẩm A", "Doanh số": 1000000 },
    { "Ngày đơn hàng": "04/20/2026", "Mã nhà thuốc": "NT001", "Tên nhà thuốc": "Nhà thuốc An Bình", "Mã sản phẩm": "SP002", "Tên sản phẩm": "Sản phẩm B", "Doanh số": 2000000 },
    { "Ngày đơn hàng": "04/10/2026", "Mã nhà thuốc": "NT002", "Tên nhà thuốc": "Nhà thuốc Minh Tâm", "Mã sản phẩm": "SP001", "Tên sản phẩm": "Sản phẩm A", "Doanh số": 800000 },
    { "Ngày đơn hàng": "04/15/2026", "Mã nhà thuốc": "NT002", "Tên nhà thuốc": "Nhà thuốc Minh Tâm", "Mã sản phẩm": "SP003", "Tên sản phẩm": "Sản phẩm C", "Doanh số": 1500000 },
    { "Ngày đơn hàng": "05/01/2026", "Mã nhà thuốc": "NT003", "Tên nhà thuốc": "Nhà thuốc Việt Pháp", "Mã sản phẩm": "SP002", "Tên sản phẩm": "Sản phẩm B", "Doanh số": 3000000 },
    { "Ngày đơn hàng": "05/05/2026", "Mã nhà thuốc": "NT004", "Tên nhà thuốc": "Nhà thuốc Không Hợp Đồng", "Mã sản phẩm": "SP001", "Tên sản phẩm": "Sản phẩm A", "Doanh số": 500000 },
  ];

  // 2. Sample Products
  const products = [
    { "Mã sản phẩm": "SP001", "Tên sản phẩm": "Sản phẩm A", "Số điểm": 5 },
    { "Mã sản phẩm": "SP002", "Tên sản phẩm": "Sản phẩm B", "Số điểm": 3 },
    { "Mã sản phẩm": "SP003", "Tên sản phẩm": "Sản phẩm C", "Số điểm": 0 }, // No points
  ];

  // 3. Sample Contracts
  const contracts = [
    { "Mã nhà thuốc": "NT001", "Tên nhà thuốc": "Nhà thuốc An Bình", "Ngày đăng ký hợp đồng": "04/15/2026", "Mức điểm cam kết": 100 },
    { "Mã nhà thuốc": "NT002", "Tên nhà thuốc": "Nhà thuốc Minh Tâm", "Ngày đăng ký hợp đồng": "04/01/2026", "Mức điểm cam kết": 50 },
    { "Mã nhà thuốc": "NT003", "Tên nhà thuốc": "Nhà thuốc Việt Pháp", "Ngày đăng ký hợp đồng": "05/10/2026", "Mức điểm cam kết": 200 },
  ];

  const downloadFile = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, fileName);
  };

  return {
    downloadOrders: () => downloadFile(orders, "Mau_Don_Hang.xlsx"),
    downloadProducts: () => downloadFile(products, "Mau_Danh_Muc_San_Pham.xlsx"),
    downloadContracts: () => downloadFile(contracts, "Mau_Hop_Dong.xlsx"),
  };
}
