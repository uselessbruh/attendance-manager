import re
import json
import requests
from bs4 import BeautifulSoup

try:
    # For Vercel
    from api.config import (
        LOGIN_PAGE_URL, AUTH_URL, DASHBOARD_URL, CALENDAR_URL, TIMETABLE_URL,
        ATTENDANCE_URL, ATTENDANCE_REFERER_URL, BASE_URL, BROWSER_HEADERS
    )
except ImportError:
    # For local testing
    from config import (
        LOGIN_PAGE_URL, AUTH_URL, DASHBOARD_URL, CALENDAR_URL, TIMETABLE_URL,
        ATTENDANCE_URL, ATTENDANCE_REFERER_URL, BASE_URL, BROWSER_HEADERS
    )


def perform_login(username, password):
    session_obj = requests.Session()
    try:
        # Get the login page first to obtain CSRF token and cookies
        r_get = session_obj.get(LOGIN_PAGE_URL, headers=BROWSER_HEADERS, timeout=10)
        r_get.raise_for_status()
        soup = BeautifulSoup(r_get.text, 'html.parser')
        
        login_csrf_input = soup.find('input', {'name': '_csrf'})
        if not login_csrf_input:
            return None, "Could not find login CSRF token. The website may be down or changed."
        login_csrf = login_csrf_input.get('value')
        if not login_csrf:
            return None, "Login CSRF token is empty."

        # Submit login credentials
        payload = {'j_username': username, 'j_password': password, '_csrf': login_csrf}
        r_post = session_obj.post(
            AUTH_URL, 
            data=payload, 
            headers={
                **BROWSER_HEADERS,
                'Referer': LOGIN_PAGE_URL,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout=10,
            allow_redirects=True
        )
        r_post.raise_for_status()

        # Check for login failure indicators
        if "Bad credentials" in r_post.text or "Invalid username or password" in r_post.text:
            return None, "Invalid credentials"
        
        # Verify login was successful by checking URL and response
        if "login" in r_post.url.lower() and "error" in r_post.url.lower():
            return None, "Login failed. Please check your credentials."
        
        # Verify we have session cookies
        if not session_obj.cookies:
            return None, "Login failed. No session created."
            
        return session_obj, None
    except requests.exceptions.Timeout:
        return None, "Connection timeout. Please try again."
    except requests.exceptions.ConnectionError:
        return None, "Unable to connect to PESU Academy. Please check your internet connection."
    except Exception as e:
        return None, f"Login error: {str(e)}"


def get_semesters_and_csrf(session_obj, username):
    # Navigate to the dashboard page after login
    dashboard_res = session_obj.get(DASHBOARD_URL, headers=BROWSER_HEADERS, timeout=10, allow_redirects=True)
    dashboard_res.raise_for_status()
    
    # Check if we were redirected back to login (session invalid)
    if "login" in dashboard_res.url.lower() or dashboard_res.url == LOGIN_PAGE_URL:
        raise ValueError("Session expired or login failed. Please try logging in again.")
    
    soup = BeautifulSoup(dashboard_res.text, 'html.parser')
    
    # Try multiple possible CSRF token locations
    csrf_input = soup.find('input', {'name': 'csrf'}) or soup.find('input', {'id': 'csrf'})
    if not csrf_input:
        # Try to find it in meta tags as alternative
        csrf_meta = soup.find('meta', {'name': 'csrf-token'})
        if csrf_meta:
            csrf_token = csrf_meta.get('content')
        else:
            raise ValueError("Could not find CSRF token. The website structure may have changed.")
    else:
        csrf_token = csrf_input.get('value')
    
    if not csrf_token:
        raise ValueError("CSRF token is empty. Login may have failed.")
    
    # Get semester options - look for select elements with batch/semester info
    semester_select = soup.find('select', {'id': 'batchId'}) or soup.find('select')
    semester_options = semester_select.find_all('option') if semester_select else []
    semesters = [{'id': opt.get('value', '').strip('"'), 'name': opt.text.strip()} 
                 for opt in semester_options if opt.get('value') and opt.get('value').strip()]
    
    # Get student name
    student_name_tag = soup.find('span', class_='app-name-font') or soup.find('span', class_='student-name')
    student_name = student_name_tag.text.strip().title() if student_name_tag else username
    
    return semesters, student_name, csrf_token


def get_attendance_data(session_obj, batch_id, csrf_token):
    if not batch_id:
        return []
    
    res = session_obj.post(
        ATTENDANCE_URL,
        data={
            'controllerMode': '6415',
            'actionType': 8,
            'batchClassId': batch_id,
            'menuId': 660
        },
        headers={**BROWSER_HEADERS, "x-csrf-token": csrf_token, "Referer": ATTENDANCE_REFERER_URL},
        timeout=10
    )
    res.raise_for_status()
    soup = BeautifulSoup(res.text, 'html.parser')
    courses = []
    for row in soup.find_all('tr'):
        cols = row.find_all('td')
        if len(cols) == 4:
            try:
                attended, total = map(int, cols[2].text.strip().split('/'))
                courses.append({
                    'code': cols[0].text.strip(),
                    'name': cols[1].text.strip(),
                    'attended': attended,
                    'total': total,
                    'percentage': int(cols[3].text.strip())
                })
            except ValueError:
                continue
    return courses


def get_calendar_data(session_obj, csrf_token):
    headers = {**BROWSER_HEADERS, "x-csrf-token": csrf_token, "Referer": ATTENDANCE_REFERER_URL}
    res = session_obj.get(CALENDAR_URL, headers=headers, timeout=10)
    res.raise_for_status()
    match = re.search(r'var obj = JSON.parse\(\'(.*?)\'\);', res.text, re.DOTALL)
    if not match:
        return []
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return []


def get_structured_timetable(session_obj, csrf_token):
    headers = {**BROWSER_HEADERS, "x-csrf-token": csrf_token, "Referer": ATTENDANCE_REFERER_URL}
    res = session_obj.get(TIMETABLE_URL, headers=headers, timeout=10)
    res.raise_for_status()
    slots_match = re.search(r'var timeTableTemplateDetailsJson=(.*?);', res.text, re.DOTALL)
    schedule_match = re.search(r'var timeTableJson=(.*?);', res.text, re.DOTALL)
    if not (slots_match and schedule_match):
        return {}
    try:
        slots_json = json.loads(slots_match.group(1))
        schedule_json = json.loads(schedule_match.group(1))
    except json.JSONDecodeError:
        return {}

    slot_times = {s['orderedBy']: f"{s['startTime']} - {s['endTime']}" for s in slots_json}
    days_map = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}

    subjects_schedule = {}
    for key, value in schedule_json.items():
        if not key.startswith('ttDivText_'):
            continue
        parts = key.split('_')
        try:
            day_index = int(parts[1])
            slot_index = int(parts[2])
        except (IndexError, ValueError):
            continue

        if day_index not in days_map:
            continue
        class_time = slot_times.get(slot_index)
        if not class_time:
            continue

        subject_info = value[0].replace('ttSubject&&', '')
        subject_code = subject_info.split('-')[0]
        subject_name = '-'.join(subject_info.split('-')[1:])
        day_name = days_map[day_index]

        subjects_schedule.setdefault(subject_code, {'name': subject_name, 'schedule': {}})
        subjects_schedule[subject_code]['schedule'].setdefault(day_name, []).append(class_time)
    return subjects_schedule
