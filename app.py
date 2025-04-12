import os
import logging
import uuid
import time
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
from werkzeug.utils import secure_filename
import threading
import shutil
from video_processor import VideoProcessor

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "videodubber_secret_key")

# Create upload and processed directories if they don't exist
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

# Store processing jobs
processing_jobs = {}

# Helper function to check allowed file
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Route for the home page
@app.route('/')
def index():
    return render_template('index.html')

# Route for video upload
@app.route('/upload', methods=['POST'])
def upload_video():
    # Check if a file was uploaded
    if 'video' not in request.files:
        flash('No file part', 'danger')
        return redirect(request.url)
    
    file = request.files['video']
    
    # Check if a file was selected
    if file.filename == '':
        flash('No selected file', 'danger')
        return redirect(request.url)
    
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
        
        # Initialize job status
        processing_jobs[job_id] = {
            'status': 'uploaded',
            'progress': 0,
            'message': 'Video uploaded successfully',
            'filename': filename,
            'target_language': target_language,
            'original_path': file_path,
            'output_path': None,
            'created_at': time.time()
        }
        
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
    return redirect(request.url)

# Route to check job status
@app.route('/status/<job_id>', methods=['GET'])
def job_status(job_id):
    if job_id in processing_jobs:
        return jsonify(processing_jobs[job_id])
    else:
        return jsonify({'status': 'not_found', 'message': 'Job not found'}), 404

# Route to download processed video
@app.route('/download/<job_id>', methods=['GET'])
def download_video(job_id):
    if job_id in processing_jobs and processing_jobs[job_id]['status'] == 'completed':
        output_path = processing_jobs[job_id]['output_path']
        if os.path.exists(output_path):
            return send_file(output_path, as_attachment=True)
    
    flash('Video not found or processing not complete', 'danger')
    return redirect(url_for('index'))

# Cleanup old jobs periodically
def cleanup_old_jobs():
    current_time = time.time()
    for job_id in list(processing_jobs.keys()):
        job = processing_jobs[job_id]
        # Remove jobs older than 1 hour
        if current_time - job.get('created_at', current_time) > 3600:
            # Try to remove job directory
            job_dir = os.path.join(UPLOAD_FOLDER, job_id)
            if os.path.exists(job_dir):
                try:
                    shutil.rmtree(job_dir)
                except Exception as e:
                    logger.error(f"Error removing job directory: {e}")
            
            # Remove from processing jobs
            processing_jobs.pop(job_id, None)

# Run cleanup periodically
@app.before_request
def before_request():
    if random.random() < 0.01:  # Run cleanup with 1% probability per request
        cleanup_old_jobs()

# Import at the end to avoid circular imports
import random
