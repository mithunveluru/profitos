import enum
from sqlalchemy import String, Boolean, Enum as PgEnum
from sqlalchemy.orm import mapped_column, Mapped
from models.base import Base, UUIDMixin, TimestampMixin

class UserRole(str, enum.Enum):
    OWNER = "owner"
    MANAGER = "manager"
    ACCOUNTS = "accounts"
    WAREHOUSE = "warehouse"

class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(PgEnum(UserRole), nullable=False, default=UserRole.WAREHOUSE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)