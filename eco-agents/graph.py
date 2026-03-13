"""
LangGraph workflows used by EcoSphere AI services.

Includes:
1) Proposal evaluator workflow (existing flow for project proposals)
2) Impact verification workflow (vision/fraud + geospatial + decision)
"""

from __future__ import annotations

import json
import math
import os
from typing import Any, Optional
from typing_extensions import TypedDict

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph


class ProposalState(TypedDict):
    proposal_id: str
    title: str
    description: str
    sdg_focus: str
    sdg_goals: list[str]
    funding_requested: str
    duration: str
    location: str
    expected_impact: str
    project_type: str
    fact_checker_feedback: Optional[str]
    financial_analyst_feedback: Optional[str]
    sdg_aligner_feedback: Optional[str]
    ai_review_report: Optional[str]
    ai_confidence_score: Optional[int]
    suggested_status: Optional[str]


class ImpactVerificationState(TypedDict):
    submission_type: str
    submission_id: str
    user_id: str
    claimed_action: str
    claim_text: str
    image_evidence: list[str]
    claimed_latitude: Optional[float]
    claimed_longitude: Optional[float]
    project_area_name: str
    project_center_latitude: Optional[float]
    project_center_longitude: Optional[float]
    radius_meters: int
    duplicate_candidates_count: int

    vision_passed: Optional[bool]
    vision_confidence: Optional[float]
    vision_reasons: list[str]
    fraud_signals: list[str]
    vision_technical_error: bool

    geo_passed: Optional[bool]
    geo_confidence: Optional[float]
    geo_reasons: list[str]
    geo_check_summary: Optional[str]
    geo_technical_error: bool

    final_decision: Optional[str]
    final_confidence: Optional[float]
    final_reasons: list[str]
    review_required: bool
    agent_report: Optional[str]


def _get_llm() -> ChatGroq:
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        temperature=0.2,
        groq_api_key=os.environ["GROQ_API_KEY"],
    )


def _get_vision_llm(model: Optional[str] = None) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model or os.getenv("GOOGLE_VISION_MODEL", "gemini-3-flash-preview"),
        temperature=0.2,
        google_api_key=os.environ["GOOGLE_API_KEY"],
    )


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius * c


def _extract_json_object(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if not text:
        return {}

    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        candidate = text[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            return {}

    return {}


def _run_google_vision_analysis(
    claimed_action: str,
    claim_text: str,
    images: list[str],
    submission_type: str,
    duplicate_candidates_count: int,
) -> dict[str, Any]:
    # Google vision path: evaluates claim consistency and fraud risk from available metadata.
    image_lines = "\n".join([f"- {url}" for url in images[:3]]) if images else "- none"

    system = SystemMessage(
        content=(
            "You are a fraud detection analyst for environmental proof verification. "
            "Return JSON only with keys: action_supported(boolean), ai_generated_likely(boolean), "
            "confidence(0-1), reasons(array), fraud_signals(array)."
        )
    )
    human = HumanMessage(
        content=(
            f"Submission Type: {submission_type}\n"
            f"Claimed Action: {claimed_action}\n"
            f"Claim Text: {claim_text}\n"
            f"Image Count: {len(images)}\n"
            f"Image URLs (sample):\n{image_lines}\n"
            f"Duplicate Candidates Count: {duplicate_candidates_count}\n\n"
            "Assess whether the claim is supported and whether there are likely fraud/manipulation signs. "
            "If the image itself cannot be directly inspected, reflect that uncertainty in confidence/reasons."
        )
    )

    preferred_model = os.getenv("GOOGLE_VISION_MODEL", "gemini-3-flash-preview").strip()
    model_candidates = [preferred_model, "gemini-3-flash-preview", "gemini-3-flash-preview"]

    # Preserve order while removing duplicates/empty values.
    seen: set[str] = set()
    ordered_candidates: list[str] = []
    for candidate in model_candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            ordered_candidates.append(candidate)

    last_error: Optional[Exception] = None
    for candidate in ordered_candidates:
        try:
            llm = _get_vision_llm(candidate)
            response = llm.invoke([system, human])
            parsed = _extract_json_object(response.content)
            return parsed if isinstance(parsed, dict) else {}
        except Exception as exc:
            last_error = exc
            if type(exc).__name__ != "NotFound":
                raise

    if last_error is not None:
        raise last_error
    return {}


def fact_checker(state: ProposalState) -> ProposalState:
    llm = _get_llm()
    system = SystemMessage(
        content=(
            "You are an expert environmental project auditor. "
            "Assess feasibility and realism. Be critical but constructive under 200 words."
        )
    )
    human = HumanMessage(
        content=(
            f"Project Title: {state['title']}\n"
            f"Location: {state['location']}\n"
            f"Type: {state['project_type']}\n"
            f"Description:\n{state['description']}\n\n"
            f"Expected Impact: {state['expected_impact']}\n\n"
            "Evaluate feasibility and realism with red flags and positives."
        )
    )
    response = llm.invoke([system, human])
    return {**state, "fact_checker_feedback": response.content}


def financial_analyst(state: ProposalState) -> ProposalState:
    llm = _get_llm()
    system = SystemMessage(
        content=(
            "You are a financial analyst for environmental projects. "
            "Assess budget and timeline proportionality in under 200 words."
        )
    )
    human = HumanMessage(
        content=(
            f"Project Title: {state['title']}\n"
            f"Funding Requested: {state['funding_requested']}\n"
            f"Duration: {state['duration']}\n"
            f"Description:\n{state['description']}\n\n"
            "Assess whether budget and timeline are realistic and proportionate."
        )
    )
    response = llm.invoke([system, human])
    return {**state, "financial_analyst_feedback": response.content}


def sdg_aligner(state: ProposalState) -> ProposalState:
    llm = _get_llm()
    sdg_goals_str = (
        ", ".join(state["sdg_goals"]) if state["sdg_goals"] else "None specified"
    )
    system = SystemMessage(
        content=(
            "You are a UN SDG expert. Validate SDG alignment and suggest up to 3 additional SDGs in under 200 words."
        )
    )
    human = HumanMessage(
        content=(
            f"Project Title: {state['title']}\n"
            f"Primary SDG Focus: {state['sdg_focus']}\n"
            f"Stated SDG Goals: {sdg_goals_str}\n"
            f"Description:\n{state['description']}\n\n"
            "Validate stated SDG alignment and flag inaccuracies."
        )
    )
    response = llm.invoke([system, human])
    return {**state, "sdg_aligner_feedback": response.content}


def synthesizer(state: ProposalState) -> ProposalState:
    llm = _get_llm()
    system = SystemMessage(
        content=(
            "You are a senior project review coordinator. Compile a markdown report and include: "
            "confidence score 0-100 and recommended status under_review|rejected."
        )
    )
    human = HumanMessage(
        content=(
            f"# Project: {state['title']}\n\n"
            f"## Feasibility Review\n{state['fact_checker_feedback']}\n\n"
            f"## Financial Review\n{state['financial_analyst_feedback']}\n\n"
            f"## SDG Alignment Review\n{state['sdg_aligner_feedback']}\n\n"
            "End with:\n"
            "## Decision\n"
            "**Confidence Score**: <number 0-100>\n"
            "**Recommended Status**: <under_review|rejected>"
        )
    )
    response = llm.invoke([system, human])
    report = response.content

    confidence_score = 50
    suggested_status = "under_review"
    for line in report.splitlines():
        line_lower = line.lower()
        if "confidence score" in line_lower:
            import re

            nums = re.findall(r"\d+", line)
            if nums:
                confidence_score = min(100, max(0, int(nums[0])))
        if "recommended status" in line_lower:
            suggested_status = (
                "rejected" if "rejected" in line_lower else "under_review"
            )

    return {
        **state,
        "ai_review_report": report,
        "ai_confidence_score": confidence_score,
        "suggested_status": suggested_status,
    }


def vision_fraud_agent(state: ImpactVerificationState) -> ImpactVerificationState:
    reasons: list[str] = []
    fraud_signals: list[str] = []
    confidence = 0.55
    technical_error = False

    if state["duplicate_candidates_count"] > 0:
        fraud_signals.append(
            f"Found {state['duplicate_candidates_count']} potential duplicate submissions with matching evidence."
        )

    try:
        vision_result = _run_google_vision_analysis(
            claimed_action=state["claimed_action"],
            claim_text=state["claim_text"],
            images=state["image_evidence"],
            submission_type=state["submission_type"],
            duplicate_candidates_count=state["duplicate_candidates_count"],
        )
        action_supported = bool(
            vision_result.get(
                "action_supported", len(state["claim_text"].strip()) >= 15
            )
        )
        ai_generated_likely = bool(vision_result.get("ai_generated_likely", False))
        model_reasons = vision_result.get("reasons") or []
        model_signals = vision_result.get("fraud_signals") or []
        confidence = _clamp01(float(vision_result.get("confidence", 0.55)))

        if isinstance(model_reasons, list):
            reasons.extend([str(item) for item in model_reasons[:5]])
        if isinstance(model_signals, list):
            fraud_signals.extend([str(item) for item in model_signals[:5]])

        if ai_generated_likely:
            fraud_signals.append(
                "Google vision analysis indicates potential synthetic/manipulated evidence."
            )

        passed = (
            action_supported
            and not ai_generated_likely
            and state["duplicate_candidates_count"] == 0
        )
    except Exception as exc:
        # Fallback to deterministic checks when the external vision provider is unavailable.
        technical_error = False
        heuristic_action_supported = len(state["claim_text"].strip()) >= 15
        passed = heuristic_action_supported and state["duplicate_candidates_count"] == 0
        confidence = 0.45 if passed else 0.35
        reasons.append(
            "Vision/fraud AI provider unavailable; used deterministic fallback checks."
        )
        reasons.append(f"Vision provider error: {type(exc).__name__}.")
        if not heuristic_action_supported:
            reasons.append("Claim text was too short for fallback support threshold.")

    if state["duplicate_candidates_count"] > 0:
        reasons.append("Evidence appears duplicated across recent submissions.")

    if not reasons:
        reasons.append("Vision/fraud analysis completed with no additional concerns.")

    return {
        **state,
        "vision_passed": passed,
        "vision_confidence": confidence,
        "vision_reasons": reasons,
        "fraud_signals": fraud_signals,
        "vision_technical_error": technical_error,
    }


def geospatial_agent(state: ImpactVerificationState) -> ImpactVerificationState:
    reasons: list[str] = []
    confidence = 0.5
    lat = state["claimed_latitude"]
    lng = state["claimed_longitude"]
    if lat is None or lng is None:
        return {
            **state,
            "geo_passed": False,
            "geo_confidence": 0.1,
            "geo_reasons": ["Missing claimed coordinates for geospatial validation."],
            "geo_check_summary": "No coordinates provided.",
            "geo_technical_error": False,
        }

    distance_ok = True
    distance_m: Optional[float] = None
    if (
        state["project_center_latitude"] is not None
        and state["project_center_longitude"] is not None
    ):
        distance_m = _haversine_distance_m(
            lat,
            lng,
            state["project_center_latitude"],
            state["project_center_longitude"],
        )
        distance_ok = distance_m <= max(50, state["radius_meters"])

    opencage_key = os.getenv("OPENCAGE_API_KEY", "").strip()
    area_match = False
    formatted = ""
    technical_error = False

    if opencage_key:
        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(
                    "https://api.opencagedata.com/geocode/v1/json",
                    params={"q": f"{lat},{lng}", "key": opencage_key, "limit": 1},
                )
                response.raise_for_status()
                data = response.json()
                results = data.get("results") or []
                if results:
                    formatted = str(results[0].get("formatted", ""))
                    candidate = f"{formatted} {json.dumps(results[0].get('components', {}))}".lower()
                    project_area = state["project_area_name"].strip().lower()
                    area_match = bool(project_area and project_area in candidate)
        except Exception:
            technical_error = True
            reasons.append("OpenCage lookup failed due to timeout or API error.")
    else:
        reasons.append(
            "OpenCage API key not configured; area match fallback unavailable."
        )

    if distance_m is not None:
        reasons.append(
            f"Distance from project center: {distance_m:.1f}m (allowed {state['radius_meters']}m)."
        )
    else:
        reasons.append("Project center unavailable; radius check skipped.")

    if opencage_key and not technical_error:
        reasons.append("Reverse geocoding completed for claimed coordinates.")

    if state["project_area_name"].strip() and opencage_key and not technical_error:
        reasons.append(
            "Project area text matched reverse-geocoded address."
            if area_match
            else "Project area text did not match reverse-geocoded address."
        )
    elif state["project_area_name"].strip() and (not opencage_key or technical_error):
        reasons.append(
            "Project area text check skipped because reverse geocoding was unavailable."
        )

    passed = distance_ok and (
        area_match if state["project_area_name"].strip() and opencage_key else True
    )

    confidence += 0.25 if distance_ok else -0.25
    if state["project_area_name"].strip() and opencage_key:
        confidence += 0.2 if area_match else -0.2
    confidence = _clamp01(confidence)

    geo_summary = (
        f"lat={lat}, lng={lng}, formatted='{formatted}', distance_m={distance_m}, "
        f"distance_ok={distance_ok}, area_match={area_match}"
    )

    return {
        **state,
        "geo_passed": passed,
        "geo_confidence": confidence,
        "geo_reasons": reasons,
        "geo_check_summary": geo_summary,
        "geo_technical_error": technical_error,
    }


def impact_decision_agent(state: ImpactVerificationState) -> ImpactVerificationState:
    reasons: list[str] = []
    reasons.extend(state.get("vision_reasons") or [])
    reasons.extend(state.get("geo_reasons") or [])

    technical_uncertainty = bool(
        state.get("vision_technical_error") or state.get("geo_technical_error")
    )
    if technical_uncertainty:
        decision = "manual_review"
        review_required = True
    else:
        if state.get("vision_passed") and state.get("geo_passed"):
            decision = "approved"
            review_required = False
        else:
            decision = "rejected"
            review_required = False

    vision_conf = state.get("vision_confidence") or 0.5
    geo_conf = state.get("geo_confidence") or 0.5
    final_confidence = _clamp01((vision_conf + geo_conf) / 2.0)

    report = (
        "## Autonomous Impact Verification\n"
        f"- Submission Type: {state['submission_type']}\n"
        f"- Submission ID: {state['submission_id']}\n"
        f"- Vision/Fraud: {'PASS' if state.get('vision_passed') else 'FAIL'}\n"
        f"- Geospatial: {'PASS' if state.get('geo_passed') else 'FAIL'}\n"
        f"- Decision: {decision}\n"
        f"- Confidence: {final_confidence:.2f}\n\n"
        "### Reasons\n" + "\n".join([f"- {r}" for r in reasons[:12]])
    )

    return {
        **state,
        "final_decision": decision,
        "final_confidence": final_confidence,
        "final_reasons": reasons[:12],
        "review_required": review_required,
        "agent_report": report,
    }


def build_proposal_graph() -> StateGraph:
    workflow = StateGraph(ProposalState)
    workflow.add_node("fact_checker", fact_checker)
    workflow.add_node("financial_analyst", financial_analyst)
    workflow.add_node("sdg_aligner", sdg_aligner)
    workflow.add_node("synthesizer", synthesizer)
    workflow.set_entry_point("fact_checker")
    workflow.add_edge("fact_checker", "financial_analyst")
    workflow.add_edge("financial_analyst", "sdg_aligner")
    workflow.add_edge("sdg_aligner", "synthesizer")
    workflow.add_edge("synthesizer", END)
    return workflow.compile()


def build_impact_graph() -> StateGraph:
    workflow = StateGraph(ImpactVerificationState)
    workflow.add_node("vision_fraud", vision_fraud_agent)
    workflow.add_node("geospatial", geospatial_agent)
    workflow.add_node("decision", impact_decision_agent)
    workflow.set_entry_point("vision_fraud")
    workflow.add_edge("vision_fraud", "geospatial")
    workflow.add_edge("geospatial", "decision")
    workflow.add_edge("decision", END)
    return workflow.compile()


proposal_evaluator = build_proposal_graph()
impact_verifier = build_impact_graph()
