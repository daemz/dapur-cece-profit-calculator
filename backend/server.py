from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ------------- DB -------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ------------- App -------------
app = FastAPI(title="UMKM Sarapan API")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGO)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGO)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=True,
        samesite="none", max_age=12 * 3600, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh, httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ------------- Models -------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MitraIn(BaseModel):
    name: str


class Mitra(BaseModel):
    id: str
    name: str
    created_at: str


class ProductIn(BaseModel):
    mitra_id: str
    menu: str
    jumlah: int = Field(ge=0)  # qty titipan / stock for the day
    harga_mitra: float = Field(ge=0)
    harga_jual: float = Field(ge=0)


class Product(BaseModel):
    id: str
    mitra_id: str
    mitra_name: str
    menu: str
    jumlah: int
    harga_mitra: float
    harga_jual: float
    created_at: str


class TransactionIn(BaseModel):
    product_id: str
    jumlah_terjual: int = Field(ge=0)
    date: Optional[str] = None  # YYYY-MM-DD


class Transaction(BaseModel):
    id: str
    product_id: str
    mitra_id: str
    mitra_name: str
    menu: str
    jumlah_terjual: int
    harga_mitra: float
    harga_jual: float
    total_pendapatan: float
    profit: float
    date: str
    created_at: str


# ------------- Helpers -------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def strip_mongo(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ------------- Auth Endpoints -------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {
        "id": user_id, "email": email, "name": payload.name, "role": "user",
        "access_token": access, "refresh_token": refresh,
    }


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {
        "id": user["id"], "email": user["email"],
        "name": user.get("name", ""), "role": user.get("role", "user"),
        "access_token": access, "refresh_token": refresh,
    }


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        new_refresh = create_refresh_token(user["id"])
        set_auth_cookies(response, access, new_refresh)
        return {"ok": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ------------- Mitra -------------
@api.post("/mitra", response_model=Mitra)
async def create_mitra(payload: MitraIn, user=Depends(get_current_user)):
    existing = await db.mitra.find_one({"name": payload.name})
    if existing:
        raise HTTPException(status_code=400, detail="Mitra sudah ada")
    doc = {"id": str(uuid.uuid4()), "name": payload.name, "created_at": now_iso()}
    await db.mitra.insert_one(doc)
    return Mitra(**strip_mongo(doc))


@api.get("/mitra", response_model=List[Mitra])
async def list_mitra(user=Depends(get_current_user)):
    items = await db.mitra.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return items


@api.put("/mitra/{mitra_id}", response_model=Mitra)
async def update_mitra(mitra_id: str, payload: MitraIn, user=Depends(get_current_user)):
    existing = await db.mitra.find_one({"id": mitra_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Mitra tidak ditemukan")
    dup = await db.mitra.find_one({"name": payload.name, "id": {"$ne": mitra_id}})
    if dup:
        raise HTTPException(status_code=400, detail="Nama mitra sudah dipakai")
    await db.mitra.update_one({"id": mitra_id}, {"$set": {"name": payload.name}})
    await db.products.update_many({"mitra_id": mitra_id}, {"$set": {"mitra_name": payload.name}})
    await db.transactions.update_many({"mitra_id": mitra_id}, {"$set": {"mitra_name": payload.name}})
    updated = await db.mitra.find_one({"id": mitra_id}, {"_id": 0})
    return Mitra(**updated)


@api.delete("/mitra/{mitra_id}")
async def delete_mitra(mitra_id: str, user=Depends(get_current_user)):
    await db.mitra.delete_one({"id": mitra_id})
    await db.products.delete_many({"mitra_id": mitra_id})
    await db.transactions.delete_many({"mitra_id": mitra_id})
    return {"ok": True}


# ------------- Products -------------
@api.post("/products", response_model=Product)
async def create_product(payload: ProductIn, user=Depends(get_current_user)):
    mitra = await db.mitra.find_one({"id": payload.mitra_id})
    if not mitra:
        raise HTTPException(status_code=404, detail="Mitra tidak ditemukan")
    doc = {
        "id": str(uuid.uuid4()),
        "mitra_id": payload.mitra_id,
        "mitra_name": mitra["name"],
        "menu": payload.menu,
        "jumlah": payload.jumlah,
        "harga_mitra": payload.harga_mitra,
        "harga_jual": payload.harga_jual,
        "created_at": now_iso(),
    }
    await db.products.insert_one(doc)
    return Product(**strip_mongo(doc))


@api.get("/products", response_model=List[Product])
async def list_products(user=Depends(get_current_user)):
    items = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@api.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductIn, user=Depends(get_current_user)):
    mitra = await db.mitra.find_one({"id": payload.mitra_id})
    if not mitra:
        raise HTTPException(status_code=404, detail="Mitra tidak ditemukan")
    update = {
        "mitra_id": payload.mitra_id,
        "mitra_name": mitra["name"],
        "menu": payload.menu,
        "jumlah": payload.jumlah,
        "harga_mitra": payload.harga_mitra,
        "harga_jual": payload.harga_jual,
    }
    result = await db.products.find_one_and_update(
        {"id": product_id}, {"$set": update}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    return Product(**strip_mongo(result))


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(get_current_user)):
    await db.products.delete_one({"id": product_id})
    await db.transactions.delete_many({"product_id": product_id})
    return {"ok": True}


# ------------- Transactions -------------
@api.post("/transactions", response_model=Transaction)
async def create_transaction(payload: TransactionIn, user=Depends(get_current_user)):
    product = await db.products.find_one({"id": payload.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    date = payload.date or today_str()
    total_pendapatan = product["harga_jual"] * payload.jumlah_terjual
    profit = (product["harga_jual"] - product["harga_mitra"]) * payload.jumlah_terjual
    doc = {
        "id": str(uuid.uuid4()),
        "product_id": product["id"],
        "mitra_id": product["mitra_id"],
        "mitra_name": product["mitra_name"],
        "menu": product["menu"],
        "jumlah_terjual": payload.jumlah_terjual,
        "harga_mitra": product["harga_mitra"],
        "harga_jual": product["harga_jual"],
        "total_pendapatan": total_pendapatan,
        "profit": profit,
        "date": date,
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(doc)
    return Transaction(**strip_mongo(doc))


@api.get("/transactions", response_model=List[Transaction])
async def list_transactions(
    date: Optional[str] = None,
    mitra_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    q = {}
    if date:
        q["date"] = date
    if mitra_id:
        q["mitra_id"] = mitra_id
    items = await db.transactions.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return items


@api.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user=Depends(get_current_user)):
    await db.transactions.delete_one({"id": tx_id})
    return {"ok": True}


# ------------- Dashboard -------------
@api.get("/dashboard/today")
async def dashboard_today(user=Depends(get_current_user)):
    today = today_str()
    mitras = await db.mitra.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    txs = await db.transactions.find({"date": today}, {"_id": 0}).to_list(5000)

    # Metrics
    total_sales = sum(t["total_pendapatan"] for t in txs)
    total_profit = sum(t["profit"] for t in txs)
    total_items = sum(t["jumlah_terjual"] for t in txs)

    # Group by mitra
    cards = []
    for m in mitras:
        m_txs = [t for t in txs if t["mitra_id"] == m["id"]]
        items = []
        m_sales = 0.0
        m_profit = 0.0
        m_setoran = 0.0
        m_count = 0
        for t in m_txs:
            setoran = t["harga_mitra"] * t["jumlah_terjual"]
            items.append({
                "menu": t["menu"],
                "jumlah_terjual": t["jumlah_terjual"],
                "harga_mitra": t["harga_mitra"],
                "harga_jual": t["harga_jual"],
                "setoran_mitra": setoran,
                "total_pendapatan": t["total_pendapatan"],
                "profit": t["profit"],
            })
            m_sales += t["total_pendapatan"]
            m_profit += t["profit"]
            m_setoran += setoran
            m_count += t["jumlah_terjual"]
        cards.append({
            "mitra_id": m["id"],
            "mitra_name": m["name"],
            "items": items,
            "total_sales": m_sales,
            "total_profit": m_profit,
            "total_setoran": m_setoran,
            "total_items": m_count,
        })

    return {
        "date": today,
        "metrics": {
            "total_sales": total_sales,
            "total_profit": total_profit,
            "total_items": total_items,
            "mitra_count": len(mitras),
        },
        "mitra_cards": cards,
    }


@api.get("/dashboard/chart")
async def dashboard_chart(period: str = "daily", user=Depends(get_current_user)):
    """period: daily (last 7 days), weekly (last 8 weeks), monthly (last 6 months)"""
    now = datetime.now(timezone.utc)
    txs = await db.transactions.find({}, {"_id": 0}).to_list(50000)

    def parse_date(s: str) -> datetime:
        return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    buckets = {}
    labels = []

    if period == "daily":
        for i in range(6, -1, -1):
            d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            buckets[d] = {"label": d, "sales": 0.0, "profit": 0.0, "items": 0}
            labels.append(d)
        for t in txs:
            if t["date"] in buckets:
                buckets[t["date"]]["sales"] += t["total_pendapatan"]
                buckets[t["date"]]["profit"] += t["profit"]
                buckets[t["date"]]["items"] += t["jumlah_terjual"]
    elif period == "weekly":
        # Last 8 weeks (Mon-Sun)
        today = now.date()
        for i in range(7, -1, -1):
            week_end = today - timedelta(days=today.weekday()) - timedelta(weeks=i - 1, days=1)
            week_start = week_end - timedelta(days=6)
            key = f"{week_start.isoformat()}_{week_end.isoformat()}"
            label = f"{week_start.strftime('%d %b')} - {week_end.strftime('%d %b')}"
            buckets[key] = {"label": label, "sales": 0.0, "profit": 0.0, "items": 0,
                             "_start": week_start, "_end": week_end}
            labels.append(key)
        for t in txs:
            try:
                td = parse_date(t["date"]).date()
            except Exception:
                continue
            for key in labels:
                b = buckets[key]
                if b["_start"] <= td <= b["_end"]:
                    b["sales"] += t["total_pendapatan"]
                    b["profit"] += t["profit"]
                    b["items"] += t["jumlah_terjual"]
                    break
    else:  # monthly
        for i in range(5, -1, -1):
            y = now.year
            m = now.month - i
            while m <= 0:
                m += 12
                y -= 1
            key = f"{y:04d}-{m:02d}"
            label = datetime(y, m, 1).strftime("%b %Y")
            buckets[key] = {"label": label, "sales": 0.0, "profit": 0.0, "items": 0}
            labels.append(key)
        for t in txs:
            ym = t["date"][:7]
            if ym in buckets:
                buckets[ym]["sales"] += t["total_pendapatan"]
                buckets[ym]["profit"] += t["profit"]
                buckets[ym]["items"] += t["jumlah_terjual"]

    series = []
    for k in labels:
        b = buckets[k]
        series.append({
            "label": b["label"],
            "sales": round(b["sales"], 2),
            "profit": round(b["profit"], 2),
            "items": b["items"],
        })
    return {"period": period, "series": series}


# ------------- Startup -------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.mitra.create_index("name", unique=True)
    await db.products.create_index("mitra_id")
    await db.transactions.create_index("date")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@sarapan.id")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
