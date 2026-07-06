import os
import json
import sys

# Ensure UTF-8 output to avoid Windows console errors when vnstock prints banners
sys.stdout.reconfigure(encoding='utf-8')

def fetch_and_save_tickers():
    print("Fetching tickers from vnstock v4 API...")
    try:
        from vnstock import Reference
        
        ref = Reference()
        df = ref.equity.list()
        
        if df is not None and not df.empty:
            # Depending on the dataframe structure, the ticker column might be 'ticker' or 'symbol'
            col = 'ticker' if 'ticker' in df.columns else 'symbol' if 'symbol' in df.columns else df.columns[0]
            tickers = df[col].tolist()
            
            # Filter out empty or invalid tickers
            tickers = [str(t).strip() for t in tickers if str(t).strip()]
            tickers.sort()
            
            print(f"Fetched {len(tickers)} tickers. Saving to JSON...")
            
            os.makedirs('src/data', exist_ok=True)
            
            with open('src/data/tickers.json', 'w', encoding='utf-8') as f:
                json.dump(tickers, f)
                
            print("Successfully saved tickers.json")
        else:
            print("Received empty dataframe from API.")
            
    except Exception as e:
        print("Error fetching tickers:", e)

if __name__ == "__main__":
    fetch_and_save_tickers()
