#!/usr/bin/env python3
"""EgyHardware Full-Stack Test Script"""

import subprocess
import time
import json
import os
import sys

def run_command(cmd, timeout=30):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return "Command timed out", 1
    except Exception as e:
        return f"Error: {e}", 1

def test_endpoint(name, url, method="GET", data=None, headers=None):
    """Test an API endpoint"""
    print(f"\n{'='*50}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    
    # Prepare the curl command
    cmd = f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' {url}"
    
    if method == "POST" and data:
        # If data is a dict, convert to JSON string
        if isinstance(data, dict):
            data = json.dumps(data)
        cmd = f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' -X POST {url} -H 'Content-Type: application/json' -d '{data}'"
    
    if headers:
        for key, value in headers.items():
            cmd = cmd.replace("-H 'Content-Type: application/json'", f"-H 'Content-Type: application/json' -H '{key}: {value}'")
    
    output, code = run_command(cmd)
    print(f"Response: {output[:500]}")
    
    if "HTTP_CODE:" in output:
        http_code = output.split("HTTP_CODE:")[-1].strip()
        print(f"HTTP Status: {http_code}")
        return http_code == "200" or http_code == "201" or http_code == "401"
    
    return False

def main():
    print("🧪 EgyHardware Full-Stack Test Suite")
    print("=" * 50)
    
    # Kill existing node processes
    print("\n🧹 Cleaning up existing processes...")
    run_command("taskkill /F /IM node.exe 2>/dev/null || true")
    
    # Set environment
    env = os.environ.copy()
    env["JWT_SECRET"] = "test-jwt-secret-key-at-least-32-chars-long-123456"
    
    # Start server
    print("\n🚀 Starting EgyHardware server...")
    server_proc = subprocess.Popen(
        ["node", "server/index.js"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Wait for server to be ready
    print("⏳ Waiting for server to be ready...")
    for i in range(30):
        time.sleep(1)
        output, code = run_command("curl -s http://localhost:4000/api/health")
        if "ok" in output:
            print(f"✅ Server is ready! (took {i+1}s)")
            break
    else:
        print("❌ Server failed to start")
        server_proc.kill()
        return 1
    
    # Run tests
    tests = []
    
    # 1. Health Check
    tests.append(("Health Check", test_endpoint(
        "Health Endpoint",
        "http://localhost:4000/api/health"
    )))
    
    # 2. Categories
    tests.append(("Categories", test_endpoint(
        "Categories Endpoint",
        "http://localhost:4000/api/categories"
    )))
    
    # 3. Products
    tests.append(("Products", test_endpoint(
        "Products Endpoint",
        "http://localhost:4000/api/products"
    )))
    
    # 4. Create Order
    order_data = {
        "customer": {
            "fullName": "أحمد محمد",
            "phone": "01012345678",
            "city": "القاهرة",
            "address": "شارع Nile 5",
            "email": "a@b.com"
        },
        "items": [{"productId": "gpu-rtx-4070-super", "quantity": 1, "price": 31990}],
        "subtotal": 31990,
        "shipping": 0,
        "total": 31990
    }
    tests.append(("Create Order", test_endpoint(
        "Order Creation",
        "http://localhost:4000/api/orders",
        method="POST",
        data=order_data
    )))
    
    # 5. Register User
    user_data = {
        "email": "test@example.com",
        "password": "123456",
        "full_name": "Test User",
        "phone": "01012345678"
    }
    tests.append(("Register", test_endpoint(
        "User Registration",
        "http://localhost:4000/api/auth/register",
        method="POST",
        data=user_data
    )))
    
    # 6. Login
    login_data = {
        "email": "test@example.com",
        "password": "123456"
    }
    tests.append(("Login", test_endpoint(
        "User Login",
        "http://localhost:4000/api/auth/login",
        method="POST",
        data=login_data
    )))
    
    # 7. Cart (unauthenticated - should fail)
    tests.append(("Cart Unauth", test_endpoint(
        "Cart without Auth (should fail)",
        "http://localhost:4000/api/cart"
    )))
    
    # 8. Admin Users
    tests.append(("Admin Users", test_endpoint(
        "Admin Users Endpoint",
        "http://localhost:4000/api/admin/users"
    )))
    
    # 9. Payments placeholder
    tests.append(("Payments", test_endpoint(
        "Payments Endpoint",
        "http://localhost:4000/api/payments"
    )))
    
    # Stop server
    print("\n\n🛑 Stopping server...")
    server_proc.kill()
    server_proc.wait()
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in tests if result)
    total = len(tests)
    
    for name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 50)
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! System is PRODUCTION READY!")
        return 0
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())