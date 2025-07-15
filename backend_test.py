#!/usr/bin/env python3
"""
Backend API Testing for Earthly Liquids Ecommerce Platform
Tests all API endpoints using the public URL
"""

import requests
import json
import sys
from datetime import datetime

class EarthlyLiquidsAPITester:
    def __init__(self, base_url="https://09ad0198-9570-4aee-aef0-99b1b6b73dd2.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.product_id = "ecoshield-1l"  # Expected product ID from backend code

    def run_test(self, name, method, endpoint, expected_status, data=None, expected_data_checks=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    
                    # Additional data validation checks
                    if expected_data_checks:
                        for check_name, check_func in expected_data_checks.items():
                            if not check_func(response_data):
                                print(f"   ❌ Data validation failed: {check_name}")
                                success = False
                            else:
                                print(f"   ✅ Data validation passed: {check_name}")
                                
                except Exception as e:
                    print(f"   Response (non-JSON): {response.text[:200]}...")
                    
            if success:
                self.tests_passed += 1
                print(f"✅ {name} - PASSED")
            else:
                print(f"❌ {name} - FAILED (Expected {expected_status}, got {response.status_code})")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except requests.exceptions.Timeout:
            print(f"❌ {name} - FAILED (Request timeout)")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ {name} - FAILED (Connection error)")
            return False, {}
        except Exception as e:
            print(f"❌ {name} - FAILED (Error: {str(e)})")
            return False, {}

    def test_root_endpoint(self):
        """Test the root endpoint"""
        return self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200,
            expected_data_checks={
                "has_message": lambda data: "message" in data and "Earthly Liquids" in data["message"]
            }
        )

    def test_get_products(self):
        """Test getting all products"""
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "api/products",
            200,
            expected_data_checks={
                "is_list": lambda data: isinstance(data, list),
                "has_products": lambda data: len(data) > 0,
                "has_ecoshield": lambda data: any(p.get("id") == "ecoshield-1l" for p in data),
                "product_has_required_fields": lambda data: all(
                    all(field in p for field in ["id", "name", "price", "description", "features"])
                    for p in data
                )
            }
        )
        return success, response

    def test_get_single_product(self):
        """Test getting a single product by ID"""
        return self.run_test(
            "Get Single Product",
            "GET",
            f"api/products/{self.product_id}",
            200,
            expected_data_checks={
                "correct_product": lambda data: data.get("id") == "ecoshield-1l",
                "correct_name": lambda data: "EcoShield" in data.get("name", ""),
                "correct_price": lambda data: data.get("price") == 159.0,
                "has_features": lambda data: isinstance(data.get("features"), list) and len(data.get("features", [])) > 0
            }
        )

    def test_create_order(self):
        """Test creating a payment order"""
        order_data = {
            "amount": 15900,  # ₹159 in paise
            "currency": "INR",
            "customer_details": {
                "name": "Test Customer",
                "email": "test@example.com",
                "phone": "9876543210",
                "address": "123 Test Street, Test City"
            }
        }
        
        return self.run_test(
            "Create Payment Order",
            "POST",
            "api/create-order",
            200,
            data=order_data,
            expected_data_checks={
                "has_order_id": lambda data: "order_id" in data,
                "has_amount": lambda data: data.get("amount") == 15900,
                "has_currency": lambda data: data.get("currency") == "INR",
                "has_key_id": lambda data: "key_id" in data
            }
        )

    def test_get_orders(self):
        """Test getting all orders"""
        return self.run_test(
            "Get All Orders",
            "GET",
            "api/orders",
            200,
            expected_data_checks={
                "is_list": lambda data: isinstance(data, list)
            }
        )

    def test_invalid_product(self):
        """Test getting a non-existent product"""
        return self.run_test(
            "Get Invalid Product",
            "GET",
            "api/products/invalid-product-id",
            404
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 60)
        print("🧪 EARTHLY LIQUIDS API TESTING")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_get_products,
            self.test_get_single_product,
            self.test_create_order,
            self.test_get_orders,
            self.test_invalid_product
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
                self.tests_run += 1
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return 0
        else:
            print("⚠️  SOME TESTS FAILED!")
            return 1

def main():
    """Main function to run all tests"""
    tester = EarthlyLiquidsAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())