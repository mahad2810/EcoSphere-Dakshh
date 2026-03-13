"""
EcoSphere AI services – FastAPI entry point.

Endpoints:
- POST /evaluate       Existing project proposal evaluator.
- POST /verify-impact  New impact verification workflow (vision/fraud + geospatial).
- GET  /health         Liveness probe.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from graph import (
    ImpactVerificationState,
    ProposalState,
    impact_verifier,
    proposal_evaluator,
)


load_dotenv()

MONGODB_URI: str = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME: str = os.environ.get("MONGODB_DB_NAME", "ecosphere")
PROPOSAL_COLLECTION: str = "projectproposals"
CALLBACK_URL: str = os.environ.get(
    "AI_IMPACT_CALLBACK_URL", "http://localhost:3000/api/verification/impact-callback"
)


mongo_client: AsyncIOMotorClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    print(f"Connected to MongoDB: {MONGODB_URI}")
    yield
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")


app = FastAPI(
    title="EcoSphere AI Services",
    description="LangGraph multi-agent services for proposals and impact verification.",
    version="2.0.0",
    lifespan=lifespan,
)


class EvaluateRequest(BaseModel):
    proposalId: str


class EvaluateResponse(BaseModel):
    success: bool
    proposalId: str
    aiConfidenceScore: int
    suggestedStatus: str
    message: str


class VerifyImpactRequest(BaseModel):
    submissionType: str
    submissionId: str
    radiusMeters: Optional[int] = 500
    projectAreaName: Optional[str] = None
    projectCenterLatitude: Optional[float] = None
    projectCenterLongitude: Optional[float] = None
    callbackUrl: Optional[str] = None


class VerifyImpactResponse(BaseModel):
    success: bool
    submissionType: str
    submissionId: str
    decision: str
    confidence: float
    message: str


def _require_client() -> AsyncIOMotorClient:
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Database not initialised.")
    return mongo_client


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def _normalize_submission_type(value: str) -> str:
    normalized = (value or "").strip().lower()
    aliases = {
        "issue": "environmental_issue",
        "environmental-issue": "environmental_issue",
        "daily-report": "daily_report",
        "dailyreport": "daily_report",
        "attendance-record": "attendance",
    }
    return aliases.get(normalized, normalized)


async def _load_submission(
    db, submission_type: str, submission_id: str
) -> dict[str, Any]:
    try:
        oid = ObjectId(submission_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submissionId format.")

    collection_map = {
        "environmental_issue": "environmentalissues",
        "attendance": "attendancerecords",
        "daily_report": "dailyreports",
    }

    collection_name = collection_map.get(submission_type)
    if not collection_name:
        raise HTTPException(
            status_code=400, detail=f"Unsupported submissionType: {submission_type}"
        )

    doc = await db[collection_name].find_one({"_id": oid})
    if not doc:
        raise HTTPException(
            status_code=404, detail=f"Submission {submission_id} not found"
        )

    return doc


async def _duplicate_candidates_count(
    db, submission_type: str, submission_id: str, image_values: list[str]
) -> int:
    if not image_values:
        return 0

    try:
        oid = ObjectId(submission_id)
    except Exception:
        return 0

    recent_cutoff = datetime.utcnow() - timedelta(days=30)

    if submission_type == "environmental_issue":
        query = {
            "_id": {"$ne": oid},
            "createdAt": {"$gte": recent_cutoff},
            "images": {"$in": image_values[:3]},
        }
        return await db["environmentalissues"].count_documents(query)

    if submission_type == "attendance":
        query = {
            "_id": {"$ne": oid},
            "createdAt": {"$gte": recent_cutoff},
            "$or": [
                {"entryPhotoUrl": {"$in": image_values[:3]}},
                {"exitPhotoUrl": {"$in": image_values[:3]}},
            ],
        }
        return await db["attendancerecords"].count_documents(query)

    if submission_type == "daily_report":
        query = {
            "_id": {"$ne": oid},
            "createdAt": {"$gte": recent_cutoff},
            "photos": {"$in": image_values[:3]},
        }
        return await db["dailyreports"].count_documents(query)

    return 0


def _build_impact_state(
    submission_type: str,
    submission_id: str,
    doc: dict[str, Any],
    duplicate_count: int,
    radius_meters: int,
    project_area_name: str,
    project_center_lat: Optional[float],
    project_center_lng: Optional[float],
) -> ImpactVerificationState:
    if submission_type == "environmental_issue":
        coords = (doc.get("location") or {}).get("coordinates") or [None, None]
        lng = _to_float(coords[0])
        lat = _to_float(coords[1])
        images = [str(img) for img in (doc.get("images") or []) if img]
        claim_text = f"{doc.get('title', '')}. {doc.get('description', '')}".strip()
        claimed_action = str(doc.get("issueType") or "environmental_issue").replace(
            "-", " "
        )
        user_id = str((doc.get("reportedBy") or {}).get("userId") or "")
    elif submission_type == "attendance":
        entry_loc = doc.get("gpsLocationEntry") or {}
        exit_loc = doc.get("gpsLocationExit") or {}
        is_checkout = bool(doc.get("exitTime"))
        lat = _to_float((exit_loc if is_checkout else entry_loc).get("latitude"))
        lng = _to_float((exit_loc if is_checkout else entry_loc).get("longitude"))
        images = [
            str(value)
            for value in [doc.get("entryPhotoUrl"), doc.get("exitPhotoUrl")]
            if value
        ]
        claim_text = str(doc.get("notes") or "attendance evidence")
        claimed_action = "attendance_checkout" if is_checkout else "attendance_checkin"
        user_id = str(doc.get("contributorId") or "")
    else:
        location = doc.get("location") or {}
        lat = _to_float(location.get("latitude"))
        lng = _to_float(location.get("longitude"))
        images = [str(photo) for photo in (doc.get("photos") or []) if photo]
        impact_metrics = doc.get("environmentalImpactMetrics") or {}
        claim_text = (
            f"{doc.get('progressSummary', '')} "
            f"Tasks: {', '.join(doc.get('tasksCompleted') or [])}. "
            f"Impact: {impact_metrics}"
        ).strip()
        claimed_action = "daily_project_report"
        user_id = str(doc.get("reporterId") or "")

    area_name = project_area_name.strip() or str(
        (doc.get("location") or {}).get("address") or ""
    )

    return {
        "submission_type": submission_type,
        "submission_id": submission_id,
        "user_id": user_id,
        "claimed_action": claimed_action,
        "claim_text": claim_text,
        "image_evidence": images,
        "claimed_latitude": lat,
        "claimed_longitude": lng,
        "project_area_name": area_name,
        "project_center_latitude": project_center_lat,
        "project_center_longitude": project_center_lng,
        "radius_meters": max(50, int(radius_meters or 500)),
        "duplicate_candidates_count": duplicate_count,
        "vision_passed": None,
        "vision_confidence": None,
        "vision_reasons": [],
        "fraud_signals": [],
        "vision_technical_error": False,
        "geo_passed": None,
        "geo_confidence": None,
        "geo_reasons": [],
        "geo_check_summary": None,
        "geo_technical_error": False,
        "final_decision": None,
        "final_confidence": None,
        "final_reasons": [],
        "review_required": True,
        "agent_report": None,
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "opencage_configured": bool(os.getenv("OPENCAGE_API_KEY")),
            "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        },
    }


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_proposal(body: EvaluateRequest):
    client = _require_client()

    try:
        oid = ObjectId(body.proposalId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid proposalId format.")

    db = client[DB_NAME]
    doc = await db[PROPOSAL_COLLECTION].find_one({"_id": oid})

    if not doc:
        raise HTTPException(
            status_code=404, detail=f"Proposal {body.proposalId} not found in database."
        )

    initial_state: ProposalState = {
        "proposal_id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "sdg_focus": doc.get("sdgFocus", ""),
        "sdg_goals": doc.get("sdgGoals", []),
        "funding_requested": doc.get("fundingRequested", "Not specified"),
        "duration": doc.get("duration", "Not specified"),
        "location": doc.get("location", ""),
        "expected_impact": doc.get("expectedImpact", ""),
        "project_type": doc.get("projectType", "research-advised"),
        "fact_checker_feedback": None,
        "financial_analyst_feedback": None,
        "sdg_aligner_feedback": None,
        "ai_review_report": None,
        "ai_confidence_score": None,
        "suggested_status": None,
    }

    final_state: ProposalState = await proposal_evaluator.ainvoke(initial_state)

    await db[PROPOSAL_COLLECTION].update_one(
        {"_id": oid},
        {
            "$set": {
                "aiReviewReport": final_state["ai_review_report"],
                "aiConfidenceScore": final_state["ai_confidence_score"],
                "status": final_state["suggested_status"],
                "updatedAt": datetime.utcnow(),
            }
        },
    )

    return EvaluateResponse(
        success=True,
        proposalId=body.proposalId,
        aiConfidenceScore=final_state["ai_confidence_score"] or 50,
        suggestedStatus=final_state["suggested_status"] or "under_review",
        message="Proposal evaluated and results saved successfully.",
    )


@app.post("/verify-impact", response_model=VerifyImpactResponse)
async def verify_impact(body: VerifyImpactRequest):
    client = _require_client()
    db = client[DB_NAME]

    submission_type = _normalize_submission_type(body.submissionType)
    doc = await _load_submission(db, submission_type, body.submissionId)

    duplicate_count = await _duplicate_candidates_count(
        db=db,
        submission_type=submission_type,
        submission_id=body.submissionId,
        image_values=(
            doc.get("images")
            or doc.get("photos")
            or [doc.get("entryPhotoUrl"), doc.get("exitPhotoUrl")]
        ),
    )

    initial_state = _build_impact_state(
        submission_type=submission_type,
        submission_id=body.submissionId,
        doc=doc,
        duplicate_count=duplicate_count,
        radius_meters=body.radiusMeters or 500,
        project_area_name=body.projectAreaName or "",
        project_center_lat=body.projectCenterLatitude,
        project_center_lng=body.projectCenterLongitude,
    )

    final_state: ImpactVerificationState = await impact_verifier.ainvoke(initial_state)

    decision = final_state.get("final_decision") or "manual_review"
    confidence = float(final_state.get("final_confidence") or 0.5)
    idempotency_key = f"{submission_type}:{body.submissionId}:{decision}"

    callback_payload = {
        "submissionType": submission_type,
        "submissionId": body.submissionId,
        "decision": decision,
        "confidence": confidence,
        "reasons": final_state.get("final_reasons") or [],
        "reviewRequired": bool(final_state.get("review_required")),
        "agentReport": final_state.get("agent_report"),
        "fraudSignals": final_state.get("fraud_signals") or [],
        "geoCheckSummary": final_state.get("geo_check_summary"),
        "idempotencyKey": idempotency_key,
        "processedAt": datetime.utcnow().isoformat(),
    }

    callback_url = (body.callbackUrl or CALLBACK_URL).strip()
    callback_secret = os.getenv("AI_VERIFICATION_CALLBACK_SECRET", "").strip()
    headers = {"Content-Type": "application/json"}
    if callback_secret:
        headers["x-ai-verification-secret"] = callback_secret

    try:
        async with httpx.AsyncClient(timeout=20.0) as http_client:
            response = await http_client.post(
                callback_url, json=callback_payload, headers=headers
            )
            response.raise_for_status()
    except Exception as exc:
        # Non-fatal for caller, but clear in logs for retries.
        print(f"Callback failed for {submission_type}/{body.submissionId}: {exc}")

    return VerifyImpactResponse(
        success=True,
        submissionType=submission_type,
        submissionId=body.submissionId,
        decision=decision,
        confidence=confidence,
        message="Impact verification completed.",
    )
