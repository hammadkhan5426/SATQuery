import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.rate_limit import limiter
from models.image_pair import ImagePair
from models.satellite_image import SatelliteImage
from schemas.image_pair import ImagePairCreate, ImagePairRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/image-pairs", tags=["image-pairs"])


# Create a new before/after image pair
@router.post("/", response_model=ImagePairRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_image_pair(request: Request, payload: ImagePairCreate, db: Session = Depends(get_db)):
    # Validate both referenced images actually exist before creating the pair
    before_image = db.query(SatelliteImage).filter(SatelliteImage.id == payload.before_image_id).first()
    if not before_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"before_image_id {payload.before_image_id} does not exist.",
        )

    after_image = db.query(SatelliteImage).filter(SatelliteImage.id == payload.after_image_id).first()
    if not after_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"after_image_id {payload.after_image_id} does not exist.",
        )

    new_pair = ImagePair(
        before_image_id=payload.before_image_id,
        after_image_id=payload.after_image_id,
        label=payload.label,
    )
    db.add(new_pair)
    db.commit()
    db.refresh(new_pair)
    logger.info(f"Created image pair (ID: {new_pair.id}): before={new_pair.before_image_id}, after={new_pair.after_image_id}")
    return new_pair
# List all image pairs, most recent first
@router.get("/", response_model=list[ImagePairRead])
@limiter.limit("60/minute")
def list_image_pairs(
    request: Request,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    pairs = (
        db.query(ImagePair)
        .order_by(ImagePair.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return pairs


# Get a single image pair by ID
@router.get("/{pair_id}", response_model=ImagePairRead)
@limiter.limit("60/minute")
def get_image_pair(request: Request, pair_id: int, db: Session = Depends(get_db)):
    pair = db.query(ImagePair).filter(ImagePair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail=f"Image pair with ID {pair_id} not found.")
    return pair


# Delete an image pair (does NOT delete the underlying images, only the pairing)
@router.delete("/{pair_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def delete_image_pair(request: Request, pair_id: int, db: Session = Depends(get_db)):
    pair = db.query(ImagePair).filter(ImagePair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404,detail=f"Image pair with ID {pair_id} not found.")
    db.delete(pair)
    db.commit()
    logger.info(f"Deleted image pair with ID {pair_id}.")
    return None
