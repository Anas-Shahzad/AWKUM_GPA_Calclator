from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Tuple

from flask import Flask, jsonify, render_template, request
from pyngrok import ngrok  # Added ngrok import


@dataclass
class Course:
    name: str
    credit_hours: float
    marks: float


def grade_point_from_marks(marks: float) -> float:
    if marks < 0:
        raise ValueError("Marks cannot be negative")
    if marks < 50:
        return 0.0
    if marks >= 90:
        return 4.0
    steps = int(marks) - 50
    grade_point = 2.0 + (steps * 0.05)
    return round(min(grade_point, 4.0), 2)


def sum_quality_points(courses: List[Course]) -> Tuple[float, float]:
    total_quality_points = 0.0
    total_credits = 0.0

    for course in courses:
        if course.credit_hours <= 0:
            raise ValueError("Credit hours must be greater than zero")
        gp = grade_point_from_marks(course.marks)
        total_quality_points += course.credit_hours * gp
        total_credits += course.credit_hours

    return total_quality_points, total_credits


def compute_gpa(courses: List[Course]) -> Tuple[float, float]:
    if not courses:
        raise ValueError("No courses provided")

    total_quality_points, total_credits = sum_quality_points(courses)

    if total_credits == 0:
        raise ValueError("Total credit hours cannot be zero")

    gpa = round(total_quality_points / total_credits, 2)
    return gpa, total_credits


def compute_cgpa_mixed(semesters: List[dict]) -> Tuple[float, float]:
    if not semesters:
        raise ValueError("No semesters provided")

    total_quality_points = 0.0
    total_credits = 0.0

    for semester in semesters:
        mode = semester.get("mode", "courses")
        if mode == "aggregate":
            try:
                gpa_value = float(semester.get("gpa", 0))
                credits = float(semester.get("credits", 0))
            except (TypeError, ValueError) as exc:
                raise ValueError("Invalid semester GPA data") from exc

            if credits <= 0:
                raise ValueError("Semester credits must be greater than zero")
            if gpa_value < 0 or gpa_value > 4:
                raise ValueError("Semester GPA must be between 0 and 4")

            total_quality_points += gpa_value * credits
            total_credits += credits
        else:
            courses_raw = semester.get("courses", []) or semester
            courses = parse_courses(courses_raw)
            qp, cr = sum_quality_points(courses)
            total_quality_points += qp
            total_credits += cr

    if total_credits == 0:
        raise ValueError("Total credit hours cannot be zero")

    cgpa = round(total_quality_points / total_credits, 2)
    return cgpa, total_credits


def parse_courses(raw_courses) -> List[Course]:
    courses: List[Course] = []
    for raw in raw_courses:
        try:
            name = (raw.get("name") or "").strip()
            credit_hours = float(raw.get("credit_hours", 0))
            marks = float(raw.get("marks", 0))
        except (TypeError, ValueError) as exc:
            raise ValueError("Invalid course data") from exc

        if not name:
            raise ValueError("Course name is required")
        if credit_hours <= 0:
            raise ValueError("Credit hours must be greater than zero")
        if marks < 0 or marks > 100:
            raise ValueError("Marks must be between 0 and 100")

        courses.append(Course(name=name, credit_hours=credit_hours, marks=marks))
    return courses


def create_app() -> Flask:
    app = Flask(__name__)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/calculate", methods=["POST"])
    def calculate():
        data = request.get_json(force=True, silent=True) or {}
        mode = data.get("mode")

        try:
            if mode == "gpa":
                courses_data = data.get("courses", [])
                courses = parse_courses(courses_data)
                gpa, total_credits = compute_gpa(courses)
                response = {
                    "result": gpa,
                    "totalCredits": total_credits,
                    "type": "GPA",
                }
            elif mode == "cgpa":
                semesters_raw = data.get("semesters", [])
                cgpa, total_credits = compute_cgpa_mixed(semesters_raw)
                response = {
                    "result": cgpa,
                    "totalCredits": total_credits,
                    "type": "CGPA",
                    "pass": cgpa >= 2.0,
                }
            else:
                return jsonify({"error": "Invalid calculation mode"}), 400

            return jsonify(response)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    return app


if __name__ == "__main__":
    app = create_app()

    from pyngrok import ngrok

    ngrok.kill()  # Clean up any stale tunnels

    ngrok_token = os.environ.get("NGROK_AUTHTOKEN")
    if not ngrok_token:
        raise RuntimeError("Set NGROK_AUTHTOKEN environment variable before starting ngrok.")

    ngrok.set_auth_token(ngrok_token)
    public_url = ngrok.connect(5000, bind_tls=True)
    print("Your app is live at:", public_url.public_url)

    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
