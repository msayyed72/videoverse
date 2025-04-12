import os
import logging
import uuid
import time
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file, session
from werkzeug.utils import secure_filename
import threading
import shutil
import random
from sqlalchemy import desc
from models import db, TranslationJob, UserPreference
from video_processor import VideoProcessor

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "videodubber_secret_key")

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize database
db.init_app(app)

# Create upload and processed directories if they don't exist
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

# Store in-memory processing jobs for active sessions
# Will be synced with database for persistence
processing_jobs = {}

# Helper function to check allowed file
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Ensure user has a session
@app.before_request
def ensure_session():
    if 'user_session_id' not in session:
        session['user_session_id'] = str(uuid.uuid4())
    
    # Run cleanup occasionally
    if random.random() < 0.01:  # 1% probability per request
        TranslationJob.cleanup_old_jobs(hours=24)

# Route for the home page
@app.route('/')
def index():
    # Get user preferences if they exist
    user_session_id = session.get('user_session_id')
    user_prefs = UserPreference.query.filter_by(session_id=user_session_id).first()
    
    if not user_prefs:
        # Create new user preferences
        user_prefs = UserPreference(
            session_id=user_session_id,
            preferred_language='en',
            theme='dark'
        )
        db.session.add(user_prefs)
        db.session.commit()
    
    # Get recent jobs for this user to display in history
    recent_jobs = TranslationJob.query.order_by(desc(TranslationJob.created_at)).limit(5).all()
    
    return render_template('index.html', 
                           user_prefs=user_prefs, 
                           recent_jobs=recent_jobs)

# Route for setting user preferences
@app.route('/preferences', methods=['POST'])
def set_preferences():
    user_session_id = session.get('user_session_id')
    if not user_session_id:
        return jsonify({'success': False, 'message': 'No session found'})
    
    preferred_language = request.form.get('preferred_language')
    theme = request.form.get('theme')
    
    # Update or create user preferences
    user_prefs = UserPreference.query.filter_by(session_id=user_session_id).first()
    
    if user_prefs:
        if preferred_language:
            user_prefs.preferred_language = preferred_language
        if theme:
            user_prefs.theme = theme
    else:
        user_prefs = UserPreference(
            session_id=user_session_id,
            preferred_language=preferred_language or 'en',
            theme=theme or 'dark'
        )
        db.session.add(user_prefs)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Preferences updated',
        'preferences': {
            'preferred_language': user_prefs.preferred_language,
            'theme': user_prefs.theme
        }
    })

# Route for video upload
@app.route('/upload', methods=['POST'])
def upload_video():
    # Check if a file was uploaded
    if 'video' not in request.files:
        flash('No file part', 'danger')
        return jsonify({'success': False, 'message': 'No file part'})
    
    file = request.files['video']
    
    # Check if a file was selected
    if file.filename == '':
        flash('No selected file', 'danger')
        return jsonify({'success': False, 'message': 'No selected file'})
    
    # Check if the file extension is allowed
    if file and allowed_file(file.filename):
        # Generate a unique ID for the job
        job_id = str(uuid.uuid4())
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Create a job directory
        job_dir = os.path.join(UPLOAD_FOLDER, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(job_dir, filename)
        file.save(file_path)
        
        # Get target language
        target_language = request.form.get('target_language', 'en')
        
        # Save file size
        file_size = os.path.getsize(file_path)
        
        # Initialize job status in memory
        job_data = {
            'status': 'uploaded',
            'progress': 0,
            'message': 'Video uploaded successfully',
            'filename': filename,
            'target_language': target_language,
            'original_path': file_path,
            'output_path': None,
            'file_size': file_size,
            'created_at': time.time()
        }
        
        processing_jobs[job_id] = job_data
        
        # Create database record
        translation_job = TranslationJob(
            id=job_id,
            filename=filename,
            original_path=file_path,
            target_language=target_language,
            status='uploaded',
            progress=0,
            message='Video uploaded successfully',
            file_size=file_size
        )
        
        # Save to database
        db.session.add(translation_job)
        db.session.commit()
        
        # Store user's last target language
        user_session_id = session.get('user_session_id')
        if user_session_id:
            user_prefs = UserPreference.query.filter_by(session_id=user_session_id).first()
            if user_prefs:
                user_prefs.last_target_language = target_language
                db.session.commit()
        
        # Start processing in a separate thread
        processor = VideoProcessor(job_id, file_path, target_language, processing_jobs)
        thread = threading.Thread(target=processor.process_video)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Video uploaded successfully. Processing started.'
        })
    
    flash('File type not allowed', 'danger')
    return jsonify({'success': False, 'message': 'File type not allowed'})

# Route to check job status
@app.route('/status/<job_id>', methods=['GET'])
def job_status(job_id):
    # Check in-memory cache first for performance
    if job_id in processing_jobs:
        # If status is completed or error, sync with database
        status = processing_jobs[job_id].get('status')
        if status in ['completed', 'error']:
            # Update database
            job = TranslationJob.query.get(job_id)
            if job:
                job.status = status
                job.progress = processing_jobs[job_id].get('progress', 0)
                job.message = processing_jobs[job_id].get('message', '')
                job.output_path = processing_jobs[job_id].get('output_path')
                
                if status == 'completed':
                    job.completed_at = datetime.utcnow()
                
                db.session.commit()
                
        return jsonify(processing_jobs[job_id])
    else:
        # Check database
        job = TranslationJob.query.get(job_id)
        if job:
            # Load job data into memory for faster access
            processing_jobs[job_id] = job.to_dict()
            return jsonify(processing_jobs[job_id])
        else:
            return jsonify({'status': 'not_found', 'message': 'Job not found'}), 404

# Route to download processed video
@app.route('/download/<job_id>', methods=['GET'])
def download_video(job_id):
    # Check in-memory cache first
    if job_id in processing_jobs and processing_jobs[job_id].get('status') == 'completed':
        output_path = processing_jobs[job_id].get('output_path')
        if output_path and os.path.exists(output_path):
            return send_file(output_path, as_attachment=True, download_name=f"dubbed_{processing_jobs[job_id].get('filename', 'video.mp4')}")
    
    # Check database
    job = TranslationJob.query.get(job_id)
    if job and job.status == 'completed' and job.output_path and os.path.exists(job.output_path):
        return send_file(job.output_path, as_attachment=True, download_name=f"dubbed_{job.filename}")
    
    flash('Video not found or processing not complete', 'danger')
    return redirect(url_for('index'))

# Route to list translation jobs
@app.route('/jobs', methods=['GET'])
def list_jobs():
    # Get most recent jobs
    jobs = TranslationJob.query.order_by(desc(TranslationJob.created_at)).limit(10).all()
    return jsonify({
        'success': True,
        'jobs': [job.to_dict() for job in jobs]
    })

# Ensure database tables exist
with app.app_context():
    db.create_all()
