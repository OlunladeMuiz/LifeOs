#!/bin/bash

# LifeOS — Development Data Seeding Script
# Run this after database is set up to populate with example data
# Usage: bash seed.sh

API="http://127.0.0.1:3001/api"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}LifeOS Development Data Seeding${NC}"
echo "=================================="
echo ""

# 1. Register test user
echo "📝 Registering test user..."
REGISTER=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@lifeos.local",
    "password": "TestPassword123"
  }')

ACCESS_TOKEN=$(echo $REGISTER | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $REGISTER | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed"
  echo "Response: $REGISTER"
  exit 1
fi

echo -e "${GREEN}✓ User registered${NC}"
echo "  Email: test@lifeos.local"
echo "  Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Set auth header
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

# 2. Create three goals
echo "🎯 Creating goals..."

GOAL1=$(curl -s -X POST "$API/goals" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "Learn TypeScript",
    "description": "Master advanced types, generics, and utilities",
    "priority": 85
  }')
GOAL1_ID=$(echo $GOAL1 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

GOAL2=$(curl -s -X POST "$API/goals" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "Build Portfolio",
    "description": "Create 3 full-stack projects for GitHub",
    "priority": 70
  }')
GOAL2_ID=$(echo $GOAL2 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

GOAL3=$(curl -s -X POST "$API/goals" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "Health & Exercise",
    "description": "Run 3x per week, consistent sleep schedule",
    "priority": 60
  }')
GOAL3_ID=$(echo $GOAL3 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo -e "${GREEN}✓ Created 3 goals${NC}"
echo "  Goal 1 ID: $GOAL1_ID"
echo "  Goal 2 ID: $GOAL2_ID"
echo "  Goal 3 ID: $GOAL3_ID"
echo ""

# 3. Create tasks for Goal 1
echo "📋 Creating tasks for Goal 1 (TypeScript)..."

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Read TypeScript Handbook\",
    \"description\": \"Complete sections 1-5 on types and interfaces\",
    \"goalId\": \"$GOAL1_ID\",
    \"priority\": 90,
    \"estimatedMinutes\": 45
  }" > /dev/null

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Refactor existing code to TypeScript\",
    \"description\": \"Convert JavaScript project to TypeScript\",
    \"goalId\": \"$GOAL1_ID\",
    \"priority\": 75,
    \"estimatedMinutes\": 120
  }" > /dev/null

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Practice advanced generics\",
    \"description\": \"Complete TypeScript generics exercises\",
    \"goalId\": \"$GOAL1_ID\",
    \"priority\": 60,
    \"estimatedMinutes\": 60
  }" > /dev/null

echo -e "${GREEN}✓ Created 3 tasks for TypeScript goal${NC}"
echo ""

# 4. Create tasks for Goal 2
echo "📋 Creating tasks for Goal 2 (Portfolio)..."

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Design portfolio website\",
    \"description\": \"Create wireframes and design mockups\",
    \"goalId\": \"$GOAL2_ID\",
    \"priority\": 80,
    \"estimatedMinutes\": 90
  }" > /dev/null

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Update GitHub repos with READMEs\",
    \"description\": \"Write comprehensive documentation\",
    \"goalId\": \"$GOAL2_ID\",
    \"priority\": 70,
    \"estimatedMinutes\": 45
  }" > /dev/null

echo -e "${GREEN}✓ Created 2 tasks for Portfolio goal${NC}"
echo ""

# 5. Create tasks for Goal 3
echo "📋 Creating tasks for Goal 3 (Health)..."

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Morning run\",
    \"description\": \"5km run at 7am\",
    \"goalId\": \"$GOAL3_ID\",
    \"priority\": 85,
    \"estimatedMinutes\": 35
  }" > /dev/null

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"title\": \"Meditation session\",
    \"description\": \"10 min mindfulness meditation\",
    \"goalId\": \"$GOAL3_ID\",
    \"priority\": 60,
    \"estimatedMinutes\": 10
  }" > /dev/null

echo -e "${GREEN}✓ Created 2 tasks for Health goal${NC}"
echo ""

# 6. Create standalone inbox tasks
echo "📭 Creating standalone inbox tasks..."

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "Reply to emails",
    "description": "Inbox clear-out",
    "priority": 40,
    "estimatedMinutes": 20
  }' > /dev/null

curl -s -X POST "$API/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "Review code from team",
    "description": "Check 3 pull requests",
    "priority": 50,
    "estimatedMinutes": 30
  }' > /dev/null

echo -e "${GREEN}✓ Created 2 inbox tasks${NC}"
echo ""

# 7. Set daily context
echo "⚙️ Setting daily context..."

curl -s -X POST "$API/context" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "date": "'$(date +%Y-%m-%d)'",
    "energyLevel": "high",
    "availableMinutes": 180,
    "obstacles": "Team sync meeting 2-3pm",
    "notes": "Feeling focused after morning coffee"
  }' > /dev/null

echo -e "${GREEN}✓ Set daily context${NC}"
echo ""

# 8. Get recommendation
echo "🎯 Getting task recommendation..."
echo ""

curl -s -X GET "$API/decision/next" \
  -H "$AUTH_HEADER" | jq '.'

echo ""
echo -e "${GREEN}=================================="
echo "✓ Development data seeded successfully!"
echo "==================================${NC}"
echo ""
echo "Test credentials:"
echo "  Email: test@lifeos.local"
echo "  Password: TestPassword123"
echo ""
echo "Next steps:"
echo "  1. Start frontend: cd frontend && npm run dev"
echo "  2. Open http://127.0.0.1:3000"
echo "  3. Login with test credentials"
echo "  4. Click 'Today' to see recommendation"
echo ""
