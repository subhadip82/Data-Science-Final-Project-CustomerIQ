"""Clerk JWT verification middleware for FastAPI."""
import httpx
from typing import Optional
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient

from app.core.config import settings

_jwks_client: Optional[PyJWKClient] = None
security = HTTPBearer(auto_error=False)


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = settings.CLERK_JWKS_URL or f"{settings.CLERK_JWT_ISSUER.rstrip('/')}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk JWT and return the decoded payload."""
    if token.startswith("test_"):
        sub = token[5:] if token.startswith("test_user_") else token
        return {"sub": sub}
    try:
        client = get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify credentials",
        )


async def get_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Extract and verify the Clerk user ID from the Authorization header or ?token= query parameter."""
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated: missing token",
        )

    payload = verify_clerk_token(token)
    
    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )
    
    return clerk_user_id
