"""
Authentication and User Management Router.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserLogin, UserCreate, UserOut, Token
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticates a user with email and password, returning a JWT token."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator.",
        )

    # Log successful login
    ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action="LOGIN",
        resource_type="auth",
        resource_id=user.id,
        details=f"User {user.email} logged in successfully.",
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Refreshes a valid access token."""
    token_data = {"sub": current_user.id, "email": current_user.email, "role": current_user.role}
    new_token = create_access_token(token_data)
    return Token(
        access_token=new_token,
        token_type="bearer",
        user=UserOut.model_validate(current_user),
    )


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Lists all users (Admin only)."""
    return [UserOut.model_validate(u) for u in db.query(User).all()]


@router.post("/users", response_model=UserOut)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Registers a new user (Admin only)."""
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    user = User(
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="CREATE_USER",
        resource_type="user",
        resource_id=user.id,
        details=f"Created user {user.email} with role {user.role}",
    )
    db.add(audit)
    db.commit()

    return UserOut.model_validate(user)
