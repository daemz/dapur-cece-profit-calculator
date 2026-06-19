"""Comprehensive backend API tests for UMKM Sarapan API.

Covers: auth (login/register/logout/me), mitra CRUD, products CRUD,
transactions CRUD with profit calc, dashboard today + chart endpoints,
and 401 protection.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://umkm-sarapan-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@sarapan.id"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, "access_token cookie not set"
    assert "refresh_token" in s.cookies, "refresh_token cookie not set"
    return s


@pytest.fixture(scope="session")
def seeded(admin_session):
    """Create a mitra + product to use across tests; cleanup at end."""
    s = admin_session
    mname = f"TEST_Mitra_{uuid.uuid4().hex[:8]}"
    r = s.post(f"{API}/mitra", json={"name": mname}, timeout=20)
    assert r.status_code == 200, r.text
    mitra = r.json()

    r = s.post(f"{API}/products", json={
        "mitra_id": mitra["id"], "menu": "TEST_Nasi Uduk",
        "jumlah": 20, "harga_mitra": 8000, "harga_jual": 10000,
    }, timeout=20)
    assert r.status_code == 200, r.text
    product = r.json()

    yield {"mitra": mitra, "product": product}

    s.delete(f"{API}/mitra/{mitra['id']}", timeout=20)


# ---------- Auth ----------
class TestAuth:
    def test_login_success_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies
        # NEW: body must also contain tokens for localStorage fallback (iframe scenario)
        assert "access_token" in data and isinstance(data["access_token"], str) and len(data["access_token"]) > 0
        assert "refresh_token" in data and isinstance(data["refresh_token"], str) and len(data["refresh_token"]) > 0

    def test_bearer_token_works_without_cookies(self):
        """Simulates iframe-blocked-cookies: clear cookies, use Authorization: Bearer."""
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        assert r.status_code == 200
        token = r.json()["access_token"]
        # No cookies, only header
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["email"] == ADMIN_EMAIL
        # Bearer-authenticated GET on a protected list
        r3 = requests.get(f"{API}/mitra", headers={"Authorization": f"Bearer {token}"}, timeout=20)
        assert r3.status_code == 200

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_with_cookie(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_cookie_401(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_register_new_user_autologin(self):
        s = requests.Session()
        email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "TEST User"
        }, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email
        assert "access_token" in s.cookies
        # me with new cookie
        r2 = s.get(f"{API}/auth/me", timeout=20)
        assert r2.status_code == 200
        assert r2.json()["email"] == email

    def test_register_duplicate_email(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": ADMIN_EMAIL, "password": "x", "name": "x"
        }, timeout=20)
        assert r.status_code == 400

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        r = s.post(f"{API}/auth/logout", timeout=20)
        assert r.status_code == 200
        # subsequent /me should fail (cookies deleted)
        s.cookies.clear()  # mimic browser deletion
        r2 = s.get(f"{API}/auth/me", timeout=20)
        assert r2.status_code == 401


# ---------- Protection ----------
class TestProtection:
    @pytest.mark.parametrize("path", [
        "/mitra", "/products", "/transactions",
        "/dashboard/today", "/dashboard/chart",
    ])
    def test_endpoints_require_auth(self, path):
        r = requests.get(f"{API}{path}", timeout=20)
        assert r.status_code == 401, f"{path} did not require auth: {r.status_code}"


# ---------- Mitra ----------
class TestMitra:
    def test_create_list_delete(self, admin_session):
        s = admin_session
        name = f"TEST_M_{uuid.uuid4().hex[:8]}"
        r = s.post(f"{API}/mitra", json={"name": name}, timeout=20)
        assert r.status_code == 200, r.text
        mid = r.json()["id"]
        assert r.json()["name"] == name

        r2 = s.get(f"{API}/mitra", timeout=20)
        assert r2.status_code == 200
        assert any(m["id"] == mid for m in r2.json())

        # duplicate
        r3 = s.post(f"{API}/mitra", json={"name": name}, timeout=20)
        assert r3.status_code == 400

        # delete
        r4 = s.delete(f"{API}/mitra/{mid}", timeout=20)
        assert r4.status_code == 200

        r5 = s.get(f"{API}/mitra", timeout=20)
        assert not any(m["id"] == mid for m in r5.json())

    def test_delete_mitra_cascades_products_and_transactions(self, admin_session):
        s = admin_session
        mname = f"TEST_Cascade_{uuid.uuid4().hex[:8]}"
        m = s.post(f"{API}/mitra", json={"name": mname}, timeout=20).json()
        p = s.post(f"{API}/products", json={
            "mitra_id": m["id"], "menu": "TEST_X", "jumlah": 5,
            "harga_mitra": 1000, "harga_jual": 2000,
        }, timeout=20).json()
        tx = s.post(f"{API}/transactions", json={
            "product_id": p["id"], "jumlah_terjual": 2,
        }, timeout=20).json()

        s.delete(f"{API}/mitra/{m['id']}", timeout=20)

        # product gone
        all_products = s.get(f"{API}/products", timeout=20).json()
        assert not any(x["id"] == p["id"] for x in all_products)
        # tx gone
        all_tx = s.get(f"{API}/transactions", params={"mitra_id": m["id"]}, timeout=20).json()
        assert not any(x["id"] == tx["id"] for x in all_tx)

    # NEW: PUT /api/mitra cascading
    def test_update_mitra_cascades_name_to_products_and_transactions(self, admin_session):
        s = admin_session
        old_name = f"TEST_OldName_{uuid.uuid4().hex[:8]}"
        new_name = f"TEST_NewName_{uuid.uuid4().hex[:8]}"
        m = s.post(f"{API}/mitra", json={"name": old_name}, timeout=20).json()
        p = s.post(f"{API}/products", json={
            "mitra_id": m["id"], "menu": "TEST_Menu", "jumlah": 3,
            "harga_mitra": 5000, "harga_jual": 7000,
        }, timeout=20).json()
        tx = s.post(f"{API}/transactions", json={
            "product_id": p["id"], "jumlah_terjual": 1,
        }, timeout=20).json()
        # rename
        r = s.put(f"{API}/mitra/{m['id']}", json={"name": new_name}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == new_name
        # cascade
        prods = s.get(f"{API}/products", timeout=20).json()
        prod = next(x for x in prods if x["id"] == p["id"])
        assert prod["mitra_name"] == new_name
        txs = s.get(f"{API}/transactions", params={"mitra_id": m["id"]}, timeout=20).json()
        assert any(x["id"] == tx["id"] and x["mitra_name"] == new_name for x in txs)
        # cleanup
        s.delete(f"{API}/mitra/{m['id']}", timeout=20)

    def test_update_mitra_duplicate_name_400(self, admin_session):
        s = admin_session
        a = s.post(f"{API}/mitra", json={"name": f"TEST_A_{uuid.uuid4().hex[:8]}"}, timeout=20).json()
        b_name = f"TEST_B_{uuid.uuid4().hex[:8]}"
        b = s.post(f"{API}/mitra", json={"name": b_name}, timeout=20).json()
        r = s.put(f"{API}/mitra/{a['id']}", json={"name": b_name}, timeout=20)
        assert r.status_code == 400
        s.delete(f"{API}/mitra/{a['id']}", timeout=20)
        s.delete(f"{API}/mitra/{b['id']}", timeout=20)

    def test_update_mitra_not_found_404(self, admin_session):
        r = admin_session.put(f"{API}/mitra/non-existent-id", json={"name": "X"}, timeout=20)
        assert r.status_code == 404


# ---------- Products ----------
class TestProducts:
    def test_create_with_bad_mitra(self, admin_session):
        r = admin_session.post(f"{API}/products", json={
            "mitra_id": "non-existent", "menu": "x", "jumlah": 1,
            "harga_mitra": 1, "harga_jual": 2,
        }, timeout=20)
        assert r.status_code == 404

    def test_update_and_delete(self, admin_session, seeded):
        s = admin_session
        p = seeded["product"]
        # update
        r = s.put(f"{API}/products/{p['id']}", json={
            "mitra_id": seeded["mitra"]["id"], "menu": "TEST_Updated",
            "jumlah": 30, "harga_mitra": 9000, "harga_jual": 12000,
        }, timeout=20)
        assert r.status_code == 200
        updated = r.json()
        assert updated["menu"] == "TEST_Updated"
        assert updated["harga_jual"] == 12000

        # verify via list
        items = s.get(f"{API}/products", timeout=20).json()
        found = next((x for x in items if x["id"] == p["id"]), None)
        assert found and found["menu"] == "TEST_Updated"


# ---------- Transactions ----------
class TestTransactions:
    def test_create_calculates_profit_and_pendapatan(self, admin_session, seeded):
        s = admin_session
        p = seeded["product"]
        # ensure product is at the seeded values (after update test it may differ if order changes)
        # Re-set to known values
        s.put(f"{API}/products/{p['id']}", json={
            "mitra_id": seeded["mitra"]["id"], "menu": "TEST_Nasi Uduk",
            "jumlah": 20, "harga_mitra": 8000, "harga_jual": 10000,
        }, timeout=20)

        r = s.post(f"{API}/transactions", json={
            "product_id": p["id"], "jumlah_terjual": 5,
        }, timeout=20)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["total_pendapatan"] == 10000 * 5
        assert tx["profit"] == (10000 - 8000) * 5
        assert tx["mitra_id"] == seeded["mitra"]["id"]
        assert "date" in tx and len(tx["date"]) == 10

        # filter by date
        rl = s.get(f"{API}/transactions", params={"date": tx["date"]}, timeout=20)
        assert rl.status_code == 200
        assert any(x["id"] == tx["id"] for x in rl.json())

        # filter by mitra_id
        rl2 = s.get(f"{API}/transactions", params={"mitra_id": seeded["mitra"]["id"]}, timeout=20)
        assert any(x["id"] == tx["id"] for x in rl2.json())

        # delete
        rd = s.delete(f"{API}/transactions/{tx['id']}", timeout=20)
        assert rd.status_code == 200

    def test_create_with_bad_product(self, admin_session):
        r = admin_session.post(f"{API}/transactions", json={
            "product_id": "non-existent", "jumlah_terjual": 1,
        }, timeout=20)
        assert r.status_code == 404


# ---------- Dashboard ----------
class TestDashboard:
    def test_today_returns_metrics_and_cards(self, admin_session, seeded):
        s = admin_session
        # ensure known product state
        s.put(f"{API}/products/{seeded['product']['id']}", json={
            "mitra_id": seeded["mitra"]["id"], "menu": "TEST_Nasi Uduk",
            "jumlah": 20, "harga_mitra": 8000, "harga_jual": 10000,
        }, timeout=20)
        tx = s.post(f"{API}/transactions", json={
            "product_id": seeded["product"]["id"], "jumlah_terjual": 3,
        }, timeout=20).json()

        r = s.get(f"{API}/dashboard/today", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "metrics" in data and "mitra_cards" in data
        m = data["metrics"]
        for k in ["total_sales", "total_profit", "total_items", "mitra_count"]:
            assert k in m
        # our seeded mitra should be present with at least our tx
        card = next((c for c in data["mitra_cards"] if c["mitra_id"] == seeded["mitra"]["id"]), None)
        assert card is not None
        assert card["total_items"] >= 3
        assert card["total_sales"] >= 30000
        # NEW: setoran fields
        assert "total_setoran" in card, "dashboard_today card missing total_setoran"
        # 3 * 8000 = 24000 (our tx)
        assert card["total_setoran"] >= 24000
        # per-item setoran_mitra
        assert len(card["items"]) > 0
        item = card["items"][0]
        for key in ["menu", "jumlah_terjual", "harga_mitra", "harga_jual", "setoran_mitra", "total_pendapatan", "profit"]:
            assert key in item, f"missing {key} in mitra_cards.items[0]"
        # check math: setoran_mitra = harga_mitra * jumlah_terjual
        assert item["setoran_mitra"] == item["harga_mitra"] * item["jumlah_terjual"]

        s.delete(f"{API}/transactions/{tx['id']}", timeout=20)

    @pytest.mark.parametrize("period,expected_len", [
        ("daily", 7),
        ("weekly", 8),
        ("monthly", 6),
    ])
    def test_chart_periods(self, admin_session, period, expected_len):
        r = admin_session.get(f"{API}/dashboard/chart", params={"period": period}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["period"] == period
        assert isinstance(data["series"], list)
        assert len(data["series"]) == expected_len
        for s_item in data["series"]:
            assert "label" in s_item and "sales" in s_item and "profit" in s_item and "items" in s_item
