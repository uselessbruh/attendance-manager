from flask import Flask, request, jsonify
from flask_cors import CORS
from .scraping import (
    perform_login, get_semesters_and_csrf,
    get_attendance_data, get_calendar_data, get_structured_timetable
)
from .config import SECRET_KEY

app = Flask(__name__)
app.secret_key = SECRET_KEY
CORS(app)

@app.route("/")
def index():
    return jsonify({"message": "Attendance API Running", "status": "active"})

@app.route("/api/login", methods=["POST"])
def api_login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Invalid request body"}), 400
            
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"success": False, "error": "Username and password required"}), 400
        
        session_obj, error = perform_login(username, password)
        if error:
            return jsonify({"success": False, "error": error}), 401
        
        # Get initial data after login
        try:
            semesters, student_name, csrf_token = get_semesters_and_csrf(session_obj, username)
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to fetch user data: {str(e)}"}), 500
        
        selected_batch_id = semesters[0]["id"] if semesters else None
        
        # Fetch data with fallbacks for individual failures
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
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

@app.route("/api/refresh", methods=["POST"])
def api_refresh():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Invalid request body"}), 400
            
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"success": False, "error": "Username and password required"}), 400
        
        session_obj, error = perform_login(username, password)
        if error:
            return jsonify({"success": False, "error": error}), 401
        
        try:
            semesters, student_name, csrf_token = get_semesters_and_csrf(session_obj, username)
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to fetch user data: {str(e)}"}), 500
        
        selected_batch_id = semesters[0]["id"] if semesters else None
        
        # Fetch data with fallbacks for individual failures
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
