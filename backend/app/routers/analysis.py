import logging
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.rate_limit import limiter
from models.analysis_result import AnalysisResult
from models.image_pair import ImagePair
from models.satellite_image import SatelliteImage
from schemas.analysis import (
    AnalysisResultRead,
    AnalyzeRequest,
    ValidateImagesRequest,
    ValidateImagesResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])

CHANGEFORMER_SERVICE_URL = "http://localhost:8001/analyze"


def _run_geodoctor_validation(before: SatelliteImage, after: SatelliteImage) -> list[str]:
    """Check basic compatibility between two images before allowing analysis."""
    issues = []

    if before.content_type != after.content_type:
        issues.append(
            f"File type mismatch: before is '{before.content_type}', after is '{after.content_type}'."
        )

    if before.modality and after.modality and before.modality != after.modality:
        issues.append(
            f"Modality mismatch: before is '{before.modality}', after is '{after.modality}'."
        )

    return issues


@router.post("/validate", response_model=ValidateImagesResponse)
@limiter.limit("60/minute")
def validate_images(request: Request, payload: ValidateImagesRequest, db: Session = Depends(get_db)):
    before = db.query(SatelliteImage).filter(SatelliteImage.id == payload.before_image_id).first()
    if not before:
        raise HTTPException(status_code=404, detail=f"before_image_id {payload.before_image_id} does not exist.")

    after = db.query(SatelliteImage).filter(SatelliteImage.id == payload.after_image_id).first()
    if not after:
        raise HTTPException(status_code=404, detail=f"after_image_id {payload.after_image_id} does not exist.")

    issues = _run_geodoctor_validation(before, after)
    return ValidateImagesResponse(compatible=len(issues) == 0, issues=issues)


@router.post("/analyze", response_model=AnalysisResultRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def analyze_image_pair(request: Request, payload: AnalyzeRequest, db: Session = Depends(get_db)):
    pair = db.query(ImagePair).filter(ImagePair.id == payload.image_pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail=f"Image pair with ID {payload.image_pair_id} not found.")

    before = db.query(SatelliteImage).filter(SatelliteImage.id == pair.before_image_id).first()
    after = db.query(SatelliteImage).filter(SatelliteImage.id == pair.after_image_id).first()

    issues = _run_geodoctor_validation(before, after)
    if issues:
        refusal_reason = " ".join(issues)
        result = AnalysisResult(
            image_pair_id=pair.id,
            question=payload.question,
            task="refused",
            answer=f"Analysis refused: images are not compatible for comparison. {refusal_reason}",
            confidence=0.0,
            execution_trace=["validate_images"],
            regions=[],
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        logger.warning(f"Analysis refused for image pair {pair.id}: {refusal_reason}")
        return result

    storage_dir = os.path.abspath("storage/images")
    before_path = os.path.join(storage_dir, before.stored_filename)
    after_path = os.path.join(storage_dir, after.stored_filename)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            with open(before_path, "rb") as bf, open(after_path, "rb") as af:
                files = {
                    "before_image": (before.original_filename, bf, before.content_type),
                    "after_image": (after.original_filename, af, after.content_type),
                }
                data = {"query": payload.question}
                response = await client.post(CHANGEFORMER_SERVICE_URL, files=files, data=data)
                response.raise_for_status()
                model_result = response.json()
    except (httpx.RequestError, httpx.HTTPStatusError, FileNotFoundError) as exc:
        logger.error(f"Change-detection service unreachable or failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach the change-detection analysis service: {exc}",
        )

    result = AnalysisResult(
        image_pair_id=pair.id,
        question=payload.question,
        task=model_result.get("task", "change_detection"),
        answer=model_result.get("answer", "Analysis complete."),
        confidence=model_result.get("confidence", 0.0),
        execution_trace=model_result.get("execution", ["validate_images", "change_detection"]),
        regions=model_result.get("regions", []),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    logger.info(f"Analysis complete for image pair {pair.id}: task={result.task}, confidence={result.confidence}")
    return result


@router.get("/analysis/{analysis_id}", response_model=AnalysisResultRead)
@limiter.limit("60/minute")
def get_analysis(request: Request, analysis_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"Analysis with ID {analysis_id} not found.")
    return result
