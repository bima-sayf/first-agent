"""
Configuration management for Telegram Summarizer.
Loads settings from .env file.
"""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    """Application settings loaded from environment variables."""
    
    # Telegram API
    api_id: int
    api_hash: str
    
    # Anthropic/Claude
    anthropic_api_key: str
    agent_id: str
    environment_id: str | None
    
    # Chat configuration
    chats: list[str]
    default_days: int
    
    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from environment variables."""
        chats_str = os.getenv("CHATS", "")
        chats = [c.strip() for c in chats_str.split(",") if c.strip()]
        
        return cls(
            api_id=int(os.getenv("TG_API_ID", "0")),
            api_hash=os.getenv("TG_API_HASH", ""),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            agent_id=os.getenv("CMA_AGENT_ID", ""),
            environment_id=os.getenv("CMA_ENVIRONMENT_ID"),
            chats=chats,
            default_days=int(os.getenv("DEFAULT_DAYS", "7")),
        )
    
    def validate(self) -> list[str]:
        """Validate configuration and return list of errors."""
        errors = []
        
        if not self.api_id or self.api_id == 0:
            errors.append("TG_API_ID must be set")
        
        if not self.api_hash:
            errors.append("TG_API_HASH must be set")
        
        if not self.anthropic_api_key:
            errors.append("ANTHROPIC_API_KEY must be set")
        
        if not self.agent_id:
            errors.append("CMA_AGENT_ID must be set")
        
        if not self.chats:
            errors.append("CHATS must be set (comma-separated list)")
        
        if self.default_days < 1:
            errors.append("DEFAULT_DAYS must be at least 1")
        
        return errors


# Global settings instance
settings = Settings.from_env()

