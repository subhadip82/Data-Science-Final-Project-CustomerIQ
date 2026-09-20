"""
Live HTTP Upload Test against running FastAPI backend on http://127.0.0.1:8000
"""
import sys
import os
import httpx

API_BASE = "http://127.0.0.1:8000"

def test_live_http_upload():
    print("=" * 60)
    print("TESTING LIVE HTTP UPLOAD ENDPOINT (CSV & XLSX)")
    print("=" * 60)

    # 1. Sync User / Auth mock token
    headers = {"Authorization": "Bearer test_token_live_upload"}
    sync_payload = {
        "clerk_user_id": "live_test_user_999",
        "email": "livetest@customeriq.local",
        "full_name": "Live HTTP Tester"
    }

    with httpx.Client(base_url=API_BASE, timeout=30.0) as client:
        # Sync user
        sync_res = client.post("/api/v1/auth/sync", json=sync_payload, headers=headers)
        print(f"Auth Sync Status: {sync_res.status_code}")
        assert sync_res.status_code == 200, f"Auth sync failed: {sync_res.text}"
        user_info = sync_res.json()
        print(f"[PASS] Synced user: {user_info.get('user', {}).get('email')}")

        # 2. Upload sales_test.csv
        sales_path = os.path.abspath("scripts/test_datasets/sales_test.csv")
        with open(sales_path, "rb") as f:
            files = {"file": ("sales_test.csv", f.read(), "text/csv")}
        
        print("\nUploading sales_test.csv...")
        upload_csv_res = client.post("/api/v1/upload", files=files, headers=headers)
        print(f"CSV Upload Response Status: {upload_csv_res.status_code}")
        if upload_csv_res.status_code != 200:
            print("ERROR BODY:", upload_csv_res.text)
        assert upload_csv_res.status_code == 200, f"CSV Upload failed: {upload_csv_res.text}"
        csv_data = upload_csv_res.json()
        print(f"[PASS] Uploaded CSV successfully! Dataset: '{csv_data['name']}', Rows: {csv_data['row_count']}, Type: {csv_data['dataset_type']}")

        # 3. Upload survey_test.xlsx
        survey_path = os.path.abspath("scripts/test_datasets/survey_test.xlsx")
        with open(survey_path, "rb") as f:
            files = {"file": ("survey_test.xlsx", f.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        
        print("\nUploading survey_test.xlsx...")
        upload_xlsx_res = client.post("/api/v1/upload", files=files, headers=headers)
        print(f"XLSX Upload Response Status: {upload_xlsx_res.status_code}")
        if upload_xlsx_res.status_code != 200:
            print("ERROR BODY:", upload_xlsx_res.text)
        assert upload_xlsx_res.status_code == 200, f"XLSX Upload failed: {upload_xlsx_res.text}"
        xlsx_data = upload_xlsx_res.json()
        print(f"[PASS] Uploaded XLSX successfully! Dataset: '{xlsx_data['name']}', Rows: {xlsx_data['row_count']}, Type: {xlsx_data['dataset_type']}")

        # 4. Check active dataset & profile
        active_res = client.get("/api/v1/datasets/active", headers=headers)
        assert active_res.status_code == 200
        print(f"[PASS] Active Dataset API verified: {active_res.json()['dataset']['name']}")

        # 5. Check Segments (Clustering) API
        seg_res = client.get("/api/v1/segments", headers=headers)
        assert seg_res.status_code == 200
        print(f"[PASS] Segments API verified: {len(seg_res.json().get('segments', []))} clusters returned.")

        # 6. Check Notifications Popover API
        notif_res = client.get("/api/v1/notifications", headers=headers)
        assert notif_res.status_code == 200
        notifs = notif_res.json()
        print(f"[PASS] Notifications API verified: {len(notifs.get('items', []))} notifications in queue.")

    print("\n" + "=" * 60)
    print("LIVE HTTP CSV & XLSX UPLOAD TEST PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    test_live_http_upload()
