import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.rate_limit import limiter
from models.satellite_image import SatelliteImage

router = APIRouter(prefix="/images", tags=["images"])

# Only these file types are accepted for upload.
# GeoTIFF files are often reported as one of these two MIME types depending on the client.
ALLOWED_CONTENT_TYPES = {
    "image/tiff",
    "image/geotiff",
    "image/png",
    "image/jpeg",
}

# Simple size cap to avoid someone uploading an enormous file (50 MB)
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


def _resolve_storage_dir() -> str:
    """Returns the absolute path to the image storage directory, creating it if needed."""
    # settings.image_storage_dir is relative to the backend/ directory (where this app runs from)
    storage_dir = os.path.abspath(settings.image_storage_dir)
    os.makedirs(storage_dir, exist_ok=True)
    return storage_dir


@router.post("/", status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    sensor: str | None = None,
    modality: str | None = None,
    satellite_id: int | None = None,
    db: Session = Depends(get_db),
):
    # Step 1: Validate content type against our allowlist
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Allowed types: {sorted(ALLOWED_CONTENT_TYPES)}.",
        )

    # Step 2: Read the file into memory and validate its size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({len(file_bytes)} bytes). Max allowed is {MAX_FILE_SIZE_BYTES} bytes.",
        )

    # Step 3: If a satellite_id was given, confirm it actually exists
    if satellite_id is not None:
        from models.satellite import Satellite
        satellite = db.query(Satellite).filter(Satellite.id == satellite_id).first()
        if not satellite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Satellite with ID {satellite_id} not found.",
            )

    # Step 4: Generate a safe, unique filename for disk storage (never trust the original filename directly)
    original_filename = file.filename or "unnamed_upload"
    file_extension = os.path.splitext(original_filename)[1]
    stored_filename = f"{uuid.uuid4().hex}{file_extension}"

    # Step 5: Write the file to disk
    storage_dir = _resolve_storage_dir()
    file_path = os.path.join(storage_dir, stored_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Step 6: Create the database record
    new_image = SatelliteImage(
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=file.content_type,
        file_size_bytes=len(file_bytes),
        sensor=sensor,
        modality=modality,
        satellite_id=satellite_id,
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)

    return {
        "id": new_image.id,
        "original_filename": new_image.original_filename,
        "content_type": new_image.content_type,
        "file_size_bytes": new_image.file_size_bytes,
        "sensor": new_image.sensor,
        "modality": new_image.modality,
        "satellite_id": new_image.satellite_id,
        "uploaded_at": new_image.uploaded_at,
    }

@router.get("/")
@limiter.limit("60/minute")
def list_images(
    request: Request,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    images = db.query(SatelliteImage).offset(skip).limit(limit).all()
    return [
        {
            "id": img.id,
            "original_filename": img.original_filename,
            "content_type": img.content_type,
            "file_size_bytes": img.file_size_bytes,
            "sensor": img.sensor,
            "modality": img.modality,
            "satellite_id": img.satellite_id,
            "uploaded_at": img.uploaded_at,
        }
        for img in images
    ]


@router.get("/{image_id}")
@limiter.limit("60/minute")
def get_image_metadata(request: Request, image_id: int, db: Session = Depends(get_db)):
    image = db.query(SatelliteImage).filter(SatelliteImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail=f"Image with ID {image_id} not found.")
    return {
        "id": image.id,
        "original_filename": image.original_filename,
        "content_type": image.content_type,
        "file_size_bytes": image.file_size_bytes,
        "sensor": image.sensor,
        "modality": image.modality,
        "satellite_id": image.satellite_id,
        "uploaded_at": image.uploaded_at,
    }


@router.get("/{image_id}/file")
@limiter.limit("60/minute")
def download_image_file(request: Request, image_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse

    image = db.query(SatelliteImage).filter(SatelliteImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail=f"Image with ID {image_id} not found.")

    storage_dir = _resolve_storage_dir()
    file_path = os.path.join(storage_dir, image.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file is missing from storage.")

    return FileResponse(file_path, media_type=image.content_type, filename=image.original_filename)
