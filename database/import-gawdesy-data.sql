-- Update Organization with Real GAWDESY Data
UPDATE organizations SET 
  name = 'Gandhian Welfare and Development Society', 
  registration_number = '11/1993', 
  founded_date = '1982-01-01', 
  vision = 'A society attained with holistic development of Education, Health and Socio-Economic well being results in standard quality of life.', 
  mission = 'Awareness generation and sensitization on components required to meet out the social values and educational developments. Social mobilization and integration of people towards attaining physical, psychological, social, political and economic well being.', 
  address = 'Main Road, Karuppur, Konerirajapuram-Post, Naducauvery - Via, Thiruvaiyaru-taluk, Thanjavur district, Tamilnadu, India PIN: 613 101', 
  phone = '+91-04362-283720', 
  email = 'gawdesy@gmail.com', 
  website = 'www.gawdesy.org', 
  status = 'active' 
WHERE id = 1;

-- Clear and insert team members
DELETE FROM team_members;
INSERT INTO team_members (first_name, last_name, email, position, phone, `order`, is_active, created_at, updated_at) VALUES 
('A.', 'Mavadiyan', 'mavadiyan@gawdesy.org', 'President', '+91-9486575506', 1, 1, NOW(), NOW()), 
('K.', 'Anbalagan', 'anbalagan@gawdesy.org', 'Vice-President', NULL, 2, 1, NOW(), NOW()), 
('K.', 'Karunamoorthy', 'karunamoorthy@gawdesy.org', 'Secretary', '+91-9443383720', 3, 1, NOW(), NOW()), 
('P.', 'Kamala', 'kamala@gawdesy.org', 'Joint Secretary', NULL, 4, 1, NOW(), NOW()), 
('M.', 'Amutha', 'amutha@gawdesy.org', 'Treasurer', NULL, 5, 1, NOW(), NOW()), 
('C.', 'Rajasekar', 'rajasekar@gawdesy.org', 'Executive Member', NULL, 6, 1, NOW(), NOW()), 
('V.', 'Rajathi', 'rajathi@gawdesy.org', 'Executive Member', NULL, 7, 1, NOW(), NOW());

-- Clear and insert programmes
DELETE FROM programmes;
INSERT INTO programmes (title, slug, description, icon, color, objectives, target_beneficiaries, sort_order, status, created_at, updated_at) VALUES 
('Health & Sanitation', 'health-sanitation', 'Improving community health through awareness programs, sanitation facilities, and healthcare access.', 'health', '#2E7D32', 'To improve overall health and sanitation conditions in rural communities.', 'Rural communities, schools, families', 1, 'active', NOW(), NOW()), 
('Self Help Groups', 'self-help-groups', 'Empowering women through Self Help Groups for socio-economic development. 600+ women members.', 'users', '#1890FF', 'To promote women empowerment through collective action and financial inclusion.', 'Women in rural areas, 600+ SHG members', 2, 'active', NOW(), NOW()), 
('TB Control', 'tb-control', 'Tuberculosis awareness and treatment support programs. 113 programmes in 56 villages.', 'medicine', '#EB2F96', 'To eliminate TB through awareness and early detection.', 'TB patients and suspects, 100+ villages', 3, 'active', NOW(), NOW()), 
('Farmers Clubs', 'farmers-clubs', 'Supporting farmers through organic farming education. 98 Farmers clubs with NABARD support.', 'leaf', '#52C41A', 'To empower farmers with modern agricultural practices.', 'Farmers, 98 clubs', 4, 'active', NOW(), NOW()), 
('Vocational Training', 'vocational-training', 'Skill development for youth and women.', 'tool', '#FAAD14', 'To provide employable skills for sustainable livelihood.', 'Youth and women, 500+ trainees', 5, 'active', NOW(), NOW()), 
('Income Generation', 'income-generation', 'Income generation activities with bank loan linkages for SHG members.', 'dollar', '#722ED1', 'To create employment and income opportunities.', 'SHG members and entrepreneurs', 6, 'active', NOW(), NOW()), 
('Environmental Programme', 'environmental-programme', 'Environmental awareness and conservation activities.', 'environment', '#13C2C2', 'To promote environmental awareness and conservation.', 'Rural communities', 7, 'active', NOW(), NOW()), 
('Youth Groups', 'youth-groups', 'Organizing youth groups for community development.', 'team', '#F5222D', 'To mobilize youth for community development.', 'Youth in rural areas', 8, 'active', NOW(), NOW());

-- Clear and insert activities
DELETE FROM activities;
INSERT INTO activities (title, slug, description, short_description, category, status, start_date, location, capacity, registered_count, is_featured, created_at, updated_at) VALUES 
('SHG Coordination Meeting Q1', 'shg-coordination-q1', 'Quarterly meeting with 600 women SHG members.', 'Coordination meeting with 600 members', 'SHG', 'published', '2024-01-15 09:00:00', 'GAWDESY Office, Karuppur', 600, 600, 1, NOW(), NOW()), 
('TB Awareness Programme', 'tb-awareness-programme', 'TB awareness in 28 villages.', 'TB awareness programme', 'Health', 'published', '2024-02-20 10:00:00', 'Multiple Villages', 3000, 2500, 1, NOW(), NOW()), 
('Farmers Club Inauguration', 'farmers-club-inauguration', 'New farmers club formation with NABARD support.', 'Farmers club inauguration', 'Agriculture', 'published', '2024-03-10 11:00:00', 'Thiruvaiyaru', 200, 150, 1, NOW(), NOW()), 
('Gandhi Memorial Rally', 'gandhi-memorial-rally', 'Annual observance with 300 SHG members.', 'Memorial rally', 'Memorial', 'published', '2024-01-30 08:00:00', 'Theradi to Cauvery River', 500, 300, 1, NOW(), NOW());

SELECT 'GAWDESY data imported successfully!' AS status;
