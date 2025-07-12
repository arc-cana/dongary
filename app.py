from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>급식실 대기 시간 안내 시스템</h1><p>서버가 정상적으로 작동 중입니다.</p>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)