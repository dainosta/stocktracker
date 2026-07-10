import os
import json
import sys
import time
from datetime import datetime
import pandas as pd

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Delay in seconds to respect vnstock guest rate limits
DELAY_BETWEEN_REQUESTS = 7.5

def calculate_average_roic(symbol):
    try:
        from vnstock import Fundamental
        fun = Fundamental()
        
        df_income = fun.equity(symbol).income_statement(period='year')
        df_balance = fun.equity(symbol).balance_sheet(period='year')
        
        if df_income is None or df_balance is None or df_income.empty or df_balance.empty:
            return symbol, None
            
        item_col_inc = 'item_en' if 'item_en' in df_income.columns else 'item' if 'item' in df_income.columns else None
        item_col_bal = 'item_en' if 'item_en' in df_balance.columns else 'item' if 'item' in df_balance.columns else None
        
        if not item_col_inc or not item_col_bal:
            return symbol, None
            
        df_income = df_income.set_index(item_col_inc).T
        df_balance = df_balance.set_index(item_col_bal).T
        
        # Get up to 5 most recent years
        years = [col for col in df_income.index if str(col).isdigit()]
        years = sorted(years, reverse=True)[:5]
        
        if not years:
            return symbol, None
            
        df_income = df_income.loc[years].apply(pd.to_numeric, errors='coerce')
        df_balance = df_balance.loc[years].apply(pd.to_numeric, errors='coerce')
        
        # Extract items - handling Vietnamese names. Note: Different companies might have slightly different names, this covers standard non-financials
        loi_nhuan_truoc_thue = df_income.get('Tổng lợi nhuận kế toán trước thuế', pd.Series(0, index=years))
        chi_phi_thue = df_income.get('Chi phí thuế TNDN hiện hành', pd.Series(0, index=years))
        von_chu_so_huu = df_balance.get('Vốn chủ sở hữu', pd.Series(0, index=years))
        no_vay_ngan_han = df_balance.get('Vay và nợ thuê tài chính ngắn hạn', pd.Series(0, index=years))
        no_vay_dai_han = df_balance.get('Vay và nợ thuê tài chính dài hạn', pd.Series(0, index=years))
        
        # If both short and long term debts are missing, it might be a bank or financial institution
        if 'Vay và nợ thuê tài chính ngắn hạn' not in df_balance.columns and 'Vay và nợ thuê tài chính dài hạn' not in df_balance.columns:
             return symbol, None # ROIC is not applicable/standard for these
        
        # Tax Rate
        tax_rate = chi_phi_thue / loi_nhuan_truoc_thue
        tax_rate = tax_rate.apply(lambda x: 0 if pd.isna(x) or x < 0 or x > 1 else x)
        
        nopat = loi_nhuan_truoc_thue * (1 - tax_rate)
        invested_capital = von_chu_so_huu + no_vay_ngan_han + no_vay_dai_han
        
        # Filter out invalid invested capital
        invested_capital = invested_capital.apply(lambda x: pd.NA if pd.isna(x) or x <= 0 else x)
        
        roic_series = nopat / invested_capital
        avg_roic_5y = roic_series.mean()
        
        if pd.isna(avg_roic_5y):
            return symbol, None
            
        return symbol, round(float(avg_roic_5y), 4)
    except Exception as e:
        return symbol, None

def main():
    print("Bắt đầu fetch và tính toán chỉ số ROIC...")
    start_time = time.time()
    
    # Check if tickers exist
    tickers_path = 'src/data/tickers.json'
    if not os.path.exists(tickers_path):
        print("Lỗi: Không tìm thấy file tickers.json. Hãy chạy fetch_tickers.py trước.")
        sys.exit(1)
        
    with open(tickers_path, 'r', encoding='utf-8') as f:
        tickers = json.load(f)
        
    print(f"Tổng số mã cần tính toán: {len(tickers)}")
    print(f"Đang xử lý (đơn luồng). Do giới hạn API miễn phí (20 req/phút), quá trình này sẽ mất khoảng {int(len(tickers) * DELAY_BETWEEN_REQUESTS / 60)} phút...")
    
    roic_data = {}
    output_path = 'src/data/roic_data.json'
    
    # Load existing data to resume if crashed
    if os.path.exists(output_path):
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                if 'data' in existing_data:
                    roic_data = existing_data['data']
                    print(f"Đã tải {len(roic_data)} mã đã xử lý từ trước. Sẽ tiếp tục xử lý các mã còn lại.")
        except Exception:
            pass
    
    processed = len(roic_data)
    total = len(tickers)
    
    for symbol in tickers:
        if symbol in roic_data:
            continue
            
        processed += 1
        print(f"Đang xử lý {symbol} ({processed}/{total})...")
        _, roic = calculate_average_roic(symbol)
        
        if roic is not None:
            roic_data[symbol] = roic
        else:
            roic_data[symbol] = "N/A"
            
        # Print progress and save EVERY ticker so we don't lose data if it crashes
        print(f"Tiến độ: {processed}/{total} ({(processed/total)*100:.1f}%)")
        
        # Save incrementally
        now = datetime.now()
        output_json = {
            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S") + f" (Đang tải {processed}/{total})",
            "data": roic_data
        }
        with open('src/data/roic_data.json', 'w', encoding='utf-8') as f:
            json.dump(output_json, f, indent=2, ensure_ascii=False)
            
        # Rate limit delay (skip for last item)
        if processed < total:
            time.sleep(DELAY_BETWEEN_REQUESTS)
                
    elapsed = time.time() - start_time
    print(f"\nHoàn thành! Đã lưu dữ liệu của {len(roic_data)} mã vào 'src/data/roic_data.json'.")
    print(f"Thời gian chạy: {elapsed:.2f} giây.")

if __name__ == "__main__":
    main()
