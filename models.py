from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

db = SQLAlchemy()

class TranslationJob(db.Model):
    __tablename__ = 'translation_jobs'

    id = db.Column(db.String(36), primary_key=True)  # UUID as string
    filename = db.Column(db.String(255), nullable=False)
    original_path = db.Column(db.String(512), nullable=False)
    output_path = db.Column(db.String(512), nullable=True)
    source_language = db.Column(db.String(10), nullable=True)
    target_language = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='uploaded')
    progress = db.Column(db.Integer, nullable=False, default=0)
    message = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    file_size = db.Column(db.Integer, nullable=True)  # Size in bytes
    duration = db.Column(db.Float, nullable=True)  # Video duration in seconds
    extra_data = db.Column(JSON, nullable=True)  # Any additional metadata
    
    def __repr__(self):
        return f'<TranslationJob {self.id}>'
    
    def to_dict(self):
        """Convert job to dictionary representation"""
        return {
            'id': self.id,
            'filename': self.filename,
            'status': self.status,
            'progress': self.progress,
            'message': self.message,
            'target_language': self.target_language,
            'source_language': self.source_language,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'file_size': self.file_size,
            'duration': self.duration,
            'output_path': self.output_path
        }
    
    @classmethod
    def get_recent_jobs(cls, limit=10):
        """Get most recent jobs"""
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def cleanup_old_jobs(cls, hours=24):
        """Delete jobs older than specified hours"""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        old_jobs = cls.query.filter(cls.created_at < cutoff).all()
        
        for job in old_jobs:
            # Delete file logic could be implemented here
            db.session.delete(job)
        
        db.session.commit()
        return len(old_jobs)

class UserPreference(db.Model):
    __tablename__ = 'user_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), nullable=False, unique=True)
    preferred_language = db.Column(db.String(10), nullable=False, default='en')
    theme = db.Column(db.String(20), nullable=False, default='dark')
    last_target_language = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<UserPreference {self.session_id}>'