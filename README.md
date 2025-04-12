To run this application locally, follow these steps:

Step 1: Install the Prerequisites
First, you need to install Python and the required libraries:

Make sure you have Python 3.10 or higher installed on your system.
Install the following system dependencies:
ffmpeg (required for audio/video processing)
Step 2: Set Up the Environment
Create a new directory for your project and navigate into it:
mkdir videodubber
cd videodubber
Create a virtual environment and activate it:
# On Windows
python -m venv venv
venv\Scripts\activate
# On macOS/Linux
python -m venv venv
source venv/bin/activate
Install the required Python packages:
pip install flask flask-sqlalchemy googletrans==4.0.0-rc1 gtts SpeechRecognition psycopg2-binary werkzeug gunicorn
Step 3: Set Up the Database
Install PostgreSQL if you don't have it already.

Create a new PostgreSQL database:

# Using psql command line
createdb videodubber
Export the database URL as an environment variable:
# On Windows
set DATABASE_URL=postgresql://username:password@localhost/videodubber
# On macOS/Linux
export DATABASE_URL=postgresql://username:password@localhost/videodubber
Replace username and password with your PostgreSQL credentials.

Step 4: Prepare the Project Files
Create all the necessary files and directories:
mkdir -p static/css static/js templates uploads processed
Create the following files with the code I provided earlier:
main.py
app.py
models.py
video_processor.py
templates/layout.html
templates/index.html
static/css/custom.css
static/js/main.js
static/js/3d-effects.js
Step 5: Run the Application
Initialize the database tables (only needed the first time):
python -c "from app import app, db; app.app_context().push(); db.create_all()"
Start the Flask development server:
python main.py
Alternatively, use Gunicorn for a more production-like environment:
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
Open your web browser and go to http://localhost:5000
Step 6: Working with the Application
Upload a video file (MP4, AVI, MOV, MKV, or WEBM) using the form.
Select a target language for translation.
Click "Upload and Process" and wait for the processing to complete.
Once processing is done, you can download the dubbed video.
Important Notes:
For proper transcription, ensure your ffmpeg installation supports audio encoding/decoding.
The application uses the free tier of Google Translate and Google Speech Recognition, which have rate limits.
Make sure you have adequate disk space for video processing.
Processing time depends on video length - longer videos take more time.
If you're using this on a production server, consider using a proper WSGI server like Gunicorn or uWSGI.
For security in production, set a proper SESSION_SECRET environment variable.
