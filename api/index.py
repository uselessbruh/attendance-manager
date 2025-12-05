from flask import Flask, request, jsonify
from flask_cors import CORS
from api.scraping import (
    perform_login, get_semesters_and_csrf,
    get_attendance_data, get_calendar_data, get_structured_timetable
)
from api.config import SECRET_KEY
import base64

app = Flask(__name__)
app.secret_key = SECRET_KEY
CORS(app)

@app.route("/")
def index():
    return jsonify({"message": "Attendance API Running", "status": "active"})

@app.route("/api/login", methods=["POST"])
def api_login():
    try:
        # Accept both FormData and JSON
        if request.is_json:
            data = request.get_json()
            username = data.get("username")
            password = data.get("password")
        else:
            username = request.form.get("username")
            password = request.form.get("password")
        
        if not username or not password:
            return jsonify({"success": False, "error": "Username and password required"}), 400
        
        _, error = perform_login(username, password)
        if error:
            return jsonify({"success": False, "error": error}), 401
        
        # Return token for stateless authentication
        token = base64.b64encode(f"{username}:{password}".encode()).decode()
        
        return jsonify({"success": True, "token": token})
    except Exception as e:
        return jsonify({"success": False, "error": f"Login error: {str(e)}"}), 500

@app.route("/api/all_data")
def api_all_data():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"success": False, "error": "Not logged in"}), 401
    
    try:
        token = auth_header.split(" ")[1]
        credentials = base64.b64decode(token).decode()
        username, password = credentials.split(":", 1)
        
        session_obj, error = perform_login(username, password)
        if error:
            return jsonify({"success": False, "error": error}), 401
        
        semesters, student_name, csrf_token = get_semesters_and_csrf(session_obj, username)
        selected_batch_id = semesters[0]["id"] if semesters else None
        
        # Fetch data with fallbacks
        attendance = []
        calendar = []
        timetable = {}
        
        try:
            attendance = get_attendance_data(session_obj, selected_batch_id, csrf_token)
        except Exception as e:
            print(f"Attendance fetch error: {e}")
        
        try:
            calendar = get_calendar_data(session_obj, csrf_token)
        except Exception as e:
            print(f"Calendar fetch error: {e}")
        
        try:
            timetable = get_structured_timetable(session_obj, csrf_token)
        except Exception as e:
            print(f"Timetable fetch error: {e}")
        
        return jsonify({
            "success": True,
            "student_name": student_name,
            "attendance": attendance,
            "semesters": semesters,
            "selected_batch_id": selected_batch_id,
            "calendar": calendar,
            "timetable": timetable,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
