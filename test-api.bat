@echo off
REM Test EduAI Registration API

echo.
echo Testing EduAI Registration...
echo.

REM Test 1: Register a new user
echo [TEST 1] Registering new student user...
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Student\",\"email\":\"teststudent@example.com\",\"password\":\"TestPass123\",\"role\":\"student\"}"

echo.
echo.

REM Test 2: Register as instructor
echo [TEST 2] Registering new instructor user...
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Instructor\",\"email\":\"testinstructor@example.com\",\"password\":\"InstructorPass123\",\"role\":\"instructor\"}"

echo.
echo.

REM Test 3: Login with student
echo [TEST 3] Logging in as student...
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"teststudent@example.com\",\"password\":\"TestPass123\"}"

echo.
echo.

REM Test 4: Login as super admin
echo [TEST 4] Logging in as super admin...
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@eduai.com\",\"password\":\"admin@123\"}"

echo.
echo Done!
pause
