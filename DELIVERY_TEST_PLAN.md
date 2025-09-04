# GEP Partner System - DELIVERY TEST PLAN

**Goal: Ensure confidence in project delivery with working healthcare scheduling system**

*External dependencies (ERP integration, full SEPE compliance) deferred to post-delivery.*

## 🎯 DELIVERY SUCCESS CRITERIA

### CRITICAL FEATURES (Must Work for Delivery)
1. **Healthcare Partner Management** - Add/view partners with specialties
2. **Customer Request Processing** - Create and manage service requests
3. **AI-Powered Scheduling** - Assign optimal partners to requests
4. **Role-Based Access** - Admin, Manager, Partner login and permissions
5. **Basic Analytics** - View assignments and performance metrics

### DEFERRED FEATURES (Post-Delivery)
- Full ERP integration
- Complete SEPE compliance export
- Advanced reporting features
- Mobile PWA capabilities
- Real-time WebSocket notifications

---

## 📋 TEST EXECUTION PLAN

### Phase 1: Infrastructure & Authentication (Day 1)

#### Test 1.1: System Deployment
**Objective**: Verify system deploys and runs consistently

**Test Steps**:
```bash
# Deploy system
docker-compose up -d

# Verify all core services running
docker-compose ps | grep -E "(backend|frontend|supabase)"

# Check database connectivity
docker-compose exec supabase-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM partners;"
```

**Success Criteria**:
- [ ] All services start without errors
- [ ] Database contains demo data (partners, clients, installations)
- [ ] Frontend serves pages on port 3000
- [ ] Backend API responds on port 3001

#### Test 1.2: Authentication System
**Objective**: Users can log in with different roles

**Test Steps**:
```bash
# Test admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gephellas.com","password":"GEPAdmin2024!"}'

# Test manager login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@gephellas.com","password":"Manager2024!"}'

# Test partner login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"partner.danezis@gephellas.com","password":"Partner2024!"}'
```

**Success Criteria**:
- [ ] Admin login returns valid JWT token
- [ ] Manager login returns valid JWT token
- [ ] Partner login returns valid JWT token
- [ ] Invalid credentials return appropriate error

### Phase 2: Core Data Management (Day 1-2)

#### Test 2.1: Partner Management
**Objective**: Healthcare professionals can be managed in the system

**Test Steps**:
```bash
# Get partners list
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:3001/api/partners

# Add new partner
curl -X POST http://localhost:3001/api/partners \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TEST001",
    "name": "Dr. Test Partner",
    "specialty": "occupational_doctor",
    "city": "Athens",
    "hourly_rate": 80.00,
    "email": "test@example.com"
  }'

# Update partner
curl -X PUT http://localhost:3001/api/partners/TEST001 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hourly_rate": 85.00}'
```

**Success Criteria**:
- [ ] Can retrieve all partners with specialties (doctors, engineers)
- [ ] Can add new healthcare partners
- [ ] Can update partner information
- [ ] Partner data includes Greek healthcare specialties
- [ ] Only admin/manager roles can modify partners

#### Test 2.2: Customer Request Management
**Objective**: Healthcare service requests can be created and managed

**Test Steps**:
```bash
# Get customer requests
curl -H "Authorization: Bearer $MANAGER_TOKEN" \
     http://localhost:3001/api/customer-requests

# Create new request
curl -X POST http://localhost:3001/api/customer-requests \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Healthcare Client",
    "service_type": "occupational_doctor",
    "installation_address": "Test Address, Athens",
    "employee_count": 20,
    "start_date": "2025-09-01",
    "end_date": "2025-12-31"
  }'
```

**Success Criteria**:
- [ ] Can view all customer requests
- [ ] Can create new healthcare service requests
- [ ] Requests include Greek healthcare service types
- [ ] Request data validates properly (dates, employee counts)

### Phase 3: AI Scheduling Core Feature (Day 2-3)

#### Test 3.1: Partner Assignment Algorithm
**Objective**: System can automatically assign optimal partners to requests

**Test Steps**:
```bash
# Test AI scheduling endpoint
curl -X POST http://localhost:3001/api/optimization/generate-schedule \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": 1,
    "serviceType": "occupational_doctor",
    "installationCode": "INST001",
    "constraints": {
      "maxBudget": 2000,
      "preferredDays": ["monday", "tuesday", "wednesday"]
    }
  }'

# Verify assignment created
curl -H "Authorization: Bearer $MANAGER_TOKEN" \
     http://localhost:3001/api/assignments

# Check optimization results
curl -H "Authorization: Bearer $MANAGER_TOKEN" \
     "http://localhost:3001/api/optimization/results?requestId=1"
```

**Success Criteria**:
- [ ] Algorithm assigns partner based on specialty match
- [ ] Assignment considers geographic proximity (Athens, Thessaloniki)
- [ ] Optimization score calculated and returned
- [ ] Assignment stored in database
- [ ] Multiple algorithm options work (Linear Programming, Rule-Based)

#### Test 3.2: Assignment Management
**Objective**: Managers can view and modify AI-generated assignments

**Test Steps**:
```bash
# View all assignments
curl -H "Authorization: Bearer $MANAGER_TOKEN" \
     http://localhost:3001/api/assignments

# Approve assignment
curl -X PUT http://localhost:3001/api/assignments/1/approve \
  -H "Authorization: Bearer $MANAGER_TOKEN"

# Reject assignment with feedback
curl -X PUT http://localhost:3001/api/assignments/1/reject \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Partner not available on requested dates"}'
```

**Success Criteria**:
- [ ] Assignments display with partner details and optimization scores
- [ ] Can approve/reject assignments
- [ ] Assignment status updates correctly
- [ ] Manager feedback captured for learning

### Phase 4: Role-Based Dashboards (Day 3-4)

#### Test 4.1: Frontend Authentication
**Objective**: Users can log in through web interface with role-specific access

**Manual Test Steps**:
1. Navigate to http://localhost:3000
2. Login with admin@gephellas.com / GEPAdmin2024!
3. Verify admin dashboard loads with all features
4. Logout and login with manager credentials
5. Verify manager dashboard shows restricted features
6. Logout and login with partner credentials
7. Verify partner dashboard shows only partner-specific info

**Success Criteria**:
- [ ] Frontend login page works
- [ ] Admin sees: Partners, Requests, Assignments, Analytics
- [ ] Manager sees: Requests, Assignments, limited Partners view
- [ ] Partner sees: Own assignments, availability, profile
- [ ] Unauthorized access properly blocked

#### Test 4.2: Partner Assignment Workflow
**Objective**: Complete end-to-end scheduling workflow works

**Manual Test Steps**:
1. Login as Manager
2. Navigate to "Customer Requests" 
3. Click "Assign Partner" on pending request
4. Trigger AI scheduling
5. Review AI recommendation with optimization score
6. Approve or modify assignment
7. Verify assignment appears in "Assignments" list
8. Login as Partner and verify assignment is visible

**Success Criteria**:
- [ ] Full workflow completes without errors
- [ ] AI recommendations appear with reasoning
- [ ] Assignment data persists correctly
- [ ] Partner receives assignment notification

### Phase 5: Basic Analytics (Day 4-5)

#### Test 5.1: Performance Metrics
**Objective**: System provides basic analytics for healthcare scheduling

**Test Steps**:
```bash
# Get analytics data
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:3001/api/analytics/dashboard

# Get partner performance
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:3001/api/analytics/partner-performance?partnerId=DOC001"

# Get optimization metrics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:3001/api/analytics/optimization-metrics"
```

**Success Criteria**:
- [ ] Dashboard shows total partners, requests, assignments
- [ ] Partner performance metrics available
- [ ] AI optimization effectiveness tracked
- [ ] Basic reporting functionality works

---

## 🚨 CRITICAL ISSUE TRACKING

### Blocking Issues (Stop Delivery)
- [ ] **Authentication system fails** - Cannot access any features
- [ ] **AI scheduling throws errors** - Core business value missing  
- [ ] **Database connectivity issues** - No data persistence
- [ ] **Frontend cannot communicate with backend** - Unusable system

### High Priority Issues (Address Before Delivery)
- [ ] **Partner assignment optimization poor** - Business value reduced
- [ ] **Role-based access not working** - Security concern
- [ ] **Greek healthcare specialties missing** - Domain requirements
- [ ] **Assignment workflow incomplete** - User experience broken

### Medium Priority Issues (Post-Delivery)
- [ ] **Performance optimization needed** - System slow but functional
- [ ] **UI/UX improvements** - Usable but not polished
- [ ] **Additional algorithm options** - Enhancement not blocker
- [ ] **Advanced reporting missing** - Nice-to-have features

---

## 📊 DELIVERY CHECKLIST

### Day 1 - Infrastructure & Basic Features
- [ ] System deploys successfully
- [ ] Authentication works for all roles
- [ ] Partners can be viewed and managed
- [ ] Customer requests can be created

### Day 2 - Core AI Scheduling
- [ ] AI partner assignment algorithm works
- [ ] Assignments can be approved/rejected
- [ ] Optimization scores calculated correctly
- [ ] Assignment data persists properly

### Day 3 - User Workflows  
- [ ] Frontend authentication functional
- [ ] Role-based dashboards working
- [ ] End-to-end assignment workflow complete
- [ ] Partner notification system basic function

### Day 4 - Analytics & Polish
- [ ] Basic analytics dashboard works
- [ ] Performance metrics available
- [ ] Greek healthcare domain data correct
- [ ] System ready for demo/handoff

### Day 5 - Final Validation
- [ ] All critical issues resolved
- [ ] End-to-end testing complete
- [ ] Performance acceptable for demo
- [ ] Documentation matches actual functionality

---

## 📝 TEST EXECUTION LOG

**Test Execution Start Date**: [TO BE FILLED]
**Testing Team**: [TO BE ASSIGNED]
**Environment**: Local Docker deployment

### Day 1 Results:
- [ ] Infrastructure tests: [PASS/FAIL]
- [ ] Authentication tests: [PASS/FAIL] 
- [ ] Partner management: [PASS/FAIL]
- [ ] Customer requests: [PASS/FAIL]

### Day 2 Results:
- [ ] AI scheduling: [PASS/FAIL]
- [ ] Assignment workflow: [PASS/FAIL]
- [ ] Optimization algorithms: [PASS/FAIL]

### Day 3 Results:
- [ ] Frontend workflows: [PASS/FAIL]
- [ ] Role-based access: [PASS/FAIL]
- [ ] End-to-end scenarios: [PASS/FAIL]

### Day 4 Results:
- [ ] Analytics features: [PASS/FAIL]
- [ ] Performance metrics: [PASS/FAIL]
- [ ] Healthcare domain validation: [PASS/FAIL]

### Day 5 Results:
- [ ] Final validation: [PASS/FAIL]
- [ ] Delivery readiness: [READY/NOT READY]

---

## 🎯 DELIVERY SUCCESS METRICS

**Minimum Viable Delivery Requirements**:
- ✅ 3 healthcare partners can be managed
- ✅ 2 customer requests can be processed  
- ✅ 1 AI assignment completes successfully
- ✅ Admin, Manager, Partner roles function
- ✅ Basic analytics show meaningful data

**Delivery Confidence Level**: [TO BE ASSESSED]
**Known Limitations**: [TO BE DOCUMENTED]
**Post-Delivery Roadmap**: [TO BE DEFINED]

---

**FOCUS**: Working software over comprehensive documentation. Every test must result in functional features or identified blocking issues.