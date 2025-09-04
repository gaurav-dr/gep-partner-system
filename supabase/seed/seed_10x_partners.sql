-- Seed data for GEP Partner Assignment System
-- 10x Partners Demo Data

-- Clear existing data
TRUNCATE TABLE email_log CASCADE;
TRUNCATE TABLE optimization_results CASCADE;
TRUNCATE TABLE assignments CASCADE;
TRUNCATE TABLE partner_availability CASCADE;
TRUNCATE TABLE customer_requests CASCADE;
TRUNCATE TABLE installations CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE partners CASCADE;

-- Insert 10 Sample Partners
INSERT INTO partners (id, name, specialty, city, hourly_rate, email, phone, max_hours_per_week, is_active) VALUES
('R00001', 'Dr. Maria Papadaki', 'Occupational Doctor', 'Athens', 85.00, 'maria.papadaki@example.com', '+30210123456', 40, true),
('R00002', 'Dr. Nikos Stavros', 'Occupational Doctor', 'Thessaloniki', 80.00, 'nikos.stavros@example.com', '+30231098765', 40, true),
('R00003', 'Dr. Elena Georgiou', 'Occupational Doctor', 'Patras', 78.00, 'elena.georgiou@example.com', '+30261012345', 40, true),
('R00004', 'Dr. Sophia Alexiou', 'Occupational Doctor', 'Heraklion', 82.00, 'sophia.alexiou@example.com', '+30281098765', 40, true),
('R00005', 'Dr. Anna Christou', 'Occupational Doctor', 'Athens', 88.00, 'anna.christou@example.com', '+30210345678', 40, true),
('R00006', 'Dr. Petros Ioannou', 'Occupational Doctor', 'Thessaloniki', 79.00, 'petros.ioannou@example.com', '+30231067890', 40, true),
('R00007', 'Dr. Konstantinos Nikolaou', 'Occupational Doctor', 'Larissa', 76.00, 'konstantinos.nikolaou@example.com', '+30241012345', 40, true),
('R00008', 'Dr. Evangelia Papanikolaou', 'Occupational Doctor', 'Volos', 81.00, 'evangelia.papanikolaou@example.com', '+30242156789', 40, true),
('R00009', 'Dr. Dimitrios Karagiannis', 'Occupational Doctor', 'Kavala', 77.00, 'dimitrios.karagiannis@example.com', '+30251023456', 40, true),
('R00010', 'Dr. Aikaterini Christodoulou', 'Occupational Doctor', 'Rhodes', 83.00, 'aikaterini.christodoulou@example.com', '+30224134567', 40, true);

-- Insert Sample Clients
INSERT INTO clients (company_code, group_name, company_name, company_type, afm, account_manager) VALUES
('C001', 'ALPHA GROUP', 'Alpha Manufacturing SA', 'Manufacturing', '123456789', 'John Papadopoulos'),
('C002', 'BETA CORP', 'Beta Logistics Ltd', 'Logistics', '987654321', 'Maria Konstantinidou'),
('C003', 'GAMMA INDUSTRIES', 'Gamma Construction SA', 'Construction', '456789123', 'Nikos Petridis');

-- Insert Sample Installations
INSERT INTO installations (installation_code, company_code, description, address, post_code, category, employees_count, work_hours, latitude, longitude) VALUES
('I001', 'C001', 'Main Manufacturing Plant', '123 Industrial Ave, Athens', '11253', 'A', 150, '08:00-17:00', 37.9755, 23.7348),
('I002', 'C002', 'Distribution Center', '789 Logistics Blvd, Thessaloniki', '54636', 'A', 85, '24/7 Shifts', 40.6401, 22.9444),
('I003', 'C003', 'Construction Site Office', '321 Building Ave, Patras', '26442', 'C', 25, '07:00-16:00', 38.2466, 21.7346);

-- Insert Sample Customer Requests
INSERT INTO customer_requests (client_name, installation_address, service_type, employee_count, installation_category, work_hours, start_date, end_date, special_requirements, estimated_hours, max_budget) VALUES
('Alpha Manufacturing SA', '123 Industrial Ave, Athens', 'occupational_doctor', 150, 'A', '08:00-17:00', '2025-09-01', '2025-09-30', 'Monthly health screenings required', 40, 3500.00),
('Beta Logistics Ltd', '789 Logistics Blvd, Thessaloniki', 'occupational_doctor', 85, 'A', '24/7 Shifts', '2025-09-15', '2025-10-15', 'Warehouse safety audit needed', 32, 2500.00),
('Gamma Construction SA', '321 Building Ave, Patras', 'occupational_doctor', 25, 'C', '07:00-16:00', '2025-09-10', '2025-09-20', 'Pre-employment medical exams', 20, 1600.00);

-- Insert Partner Availability (next 30 days)
INSERT INTO partner_availability (partner_id, date, available_hours, booked_hours) VALUES
-- Dr. Maria Papadaki (R00001)
('R00001', '2025-09-05', 8.0, 0.0),
('R00001', '2025-09-06', 8.0, 4.0),
('R00001', '2025-09-09', 8.0, 0.0),
('R00001', '2025-09-10', 8.0, 6.0),
('R00001', '2025-09-11', 8.0, 0.0),

-- Dr. Nikos Stavros (R00002) 
('R00002', '2025-09-05', 8.0, 0.0),
('R00002', '2025-09-06', 8.0, 0.0),
('R00002', '2025-09-09', 8.0, 8.0),
('R00002', '2025-09-10', 8.0, 0.0),
('R00002', '2025-09-11', 8.0, 3.0),

-- Dr. Elena Georgiou (R00003)
('R00003', '2025-09-05', 8.0, 0.0),
('R00003', '2025-09-06', 8.0, 0.0),
('R00003', '2025-09-09', 8.0, 0.0),
('R00003', '2025-09-10', 8.0, 4.0),
('R00003', '2025-09-11', 8.0, 0.0);

-- Insert Sample Assignments
INSERT INTO assignments (request_id, partner_id, installation_code, service_type, assigned_hours, hourly_rate, status, optimization_score, travel_distance, email_sent_at, response_deadline) VALUES
(1, 'R00001', 'I001', 'occupational_doctor', 40, 85.00, 'accepted', 92.5, 5.2, NOW() - INTERVAL '2 days', NOW() + INTERVAL '22 hours'),
(2, 'R00002', 'I002', 'occupational_doctor', 32, 80.00, 'proposed', 88.7, 8.1, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '18 hours');

-- Insert Sample Optimization Results
INSERT INTO optimization_results (request_id, execution_time_ms, total_partners_evaluated, top_candidates, selected_partner_id, optimization_parameters) VALUES
(1, 156, 4, '[{"partner_id": "R00001", "score": 92.5}, {"partner_id": "R00005", "score": 89.2}, {"partner_id": "R00003", "score": 76.8}]', 'R00001', '{"location_weight": 0.4, "availability_weight": 0.3, "cost_weight": 0.2, "specialty_weight": 0.1}'),
(2, 203, 3, '[{"partner_id": "R00002", "score": 88.7}, {"partner_id": "R00006", "score": 82.1}]', 'R00002', '{"location_weight": 0.4, "availability_weight": 0.3, "cost_weight": 0.2, "specialty_weight": 0.1}');

-- Insert Email Log entries
INSERT INTO email_log (assignment_id, recipient_email, email_type, subject, delivery_status) VALUES
(1, 'maria.papadaki@example.com', 'assignment_notification', 'New Assignment Opportunity - Alpha Manufacturing SA', 'delivered'),
(2, 'nikos.stavros@example.com', 'assignment_notification', 'New Assignment Opportunity - Beta Logistics Ltd', 'delivered');