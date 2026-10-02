import { STREAMS, COLLAB_TYPES } from "@shared/schema";

// Comprehensive skills library organized by academic stream
export const SKILLS_BY_STREAM: Record<typeof STREAMS[number], string[]> = {
  'Engineering & Technology': [
    'Mechanical Design', 'CAD/CAM', 'Thermodynamics', 'Robotics', 'Automation',
    'Circuit Design', 'PCB Design', 'Embedded Systems', 'PLC Programming',
    'Structural Analysis', 'Civil Engineering', 'Surveying', 'AutoCAD',
    'Chemical Process Design', 'Material Science', 'Manufacturing'
  ],
  'Computer Science & IT': [
    'Python', 'JavaScript', 'Java', 'C++', 'React', 'Node.js', 'Angular',
    'Data Structures', 'Algorithms', 'Machine Learning', 'AI', 'Deep Learning',
    'Web Development', 'Mobile Development', 'Cloud Computing', 'DevOps',
    'Cybersecurity', 'Database Management', 'Blockchain', 'IoT'
  ],
  'Science': [
    'Lab Techniques', 'Data Analysis', 'Research Methodology', 'Statistical Analysis',
    'Experimental Design', 'Microscopy', 'Spectroscopy', 'Chromatography',
    'Physics Modeling', 'Chemistry Lab Skills', 'Biology Research', 'Genetics',
    'Biotechnology', 'Organic Chemistry', 'Inorganic Chemistry', 'Quantum Mechanics'
  ],
  'Medicine & Health Sciences': [
    'Clinical Skills', 'Patient Care', 'Medical Diagnosis', 'Anatomy', 'Physiology',
    'Pharmacology', 'Surgery Basics', 'Emergency Medicine', 'Radiology',
    'Medical Research', 'Evidence-Based Medicine', 'Public Health', 'Epidemiology',
    'Medical Ethics', 'Clinical Trials', 'Healthcare Management'
  ],
  'Commerce & Business': [
    'Accounting', 'Financial Analysis', 'Bookkeeping', 'Taxation', 'Auditing',
    'Business Strategy', 'Marketing', 'Sales', 'Supply Chain Management',
    'Financial Modeling', 'Investment Analysis', 'Cost Management', 'Business Analytics',
    'Excel/Spreadsheets', 'Tally', 'SAP', 'QuickBooks', 'Market Research'
  ],
  'Arts': [
    'Painting', 'Drawing', 'Sculpture', 'Photography', 'Digital Art',
    'Illustration', 'Printmaking', 'Mixed Media', 'Art History', 'Art Critique',
    'Visual Composition', 'Color Theory', 'Portfolio Development', 'Art Curation',
    'Gallery Management', 'Contemporary Art'
  ],
  'Humanities': [
    'Critical Thinking', 'Research Writing', 'Literature Analysis', 'Philosophy',
    'Ethics', 'Cultural Studies', 'Historical Research', 'Archival Work',
    'Textual Analysis', 'Comparative Studies', 'Academic Writing', 'Thesis Writing',
    'Qualitative Research', 'Interdisciplinary Studies'
  ],
  'Social Sciences': [
    'Survey Design', 'Data Collection', 'Qualitative Analysis', 'Quantitative Research',
    'Fieldwork', 'Ethnography', 'Social Research', 'Policy Analysis',
    'Community Engagement', 'Social Theory', 'Statistical Methods', 'SPSS',
    'Focus Groups', 'Interview Techniques', 'Behavioral Analysis'
  ],
  'Law': [
    'Legal Research', 'Case Analysis', 'Legal Writing', 'Drafting', 'Advocacy',
    'Moot Court', 'Negotiation', 'Mediation', 'Contract Law', 'Criminal Law',
    'Constitutional Law', 'Corporate Law', 'Intellectual Property', 'Litigation',
    'Legal Documentation', 'Court Procedures'
  ],
  'Design & Architecture': [
    'Architectural Drawing', 'CAD', 'SketchUp', 'Revit', '3D Modeling', 'Rendering',
    'Urban Planning', 'Interior Design', 'Landscape Design', 'Sustainable Design',
    'Building Codes', 'Construction Management', 'Space Planning', 'Materials Selection',
    'Photoshop', 'Illustrator', 'InDesign', 'Rhino'
  ],
  'Media & Communication': [
    'Video Editing', 'Photography', 'Journalism', 'Copywriting', 'Content Writing',
    'Public Relations', 'Social Media Management', 'Broadcasting', 'Film Production',
    'Scriptwriting', 'Adobe Premiere', 'Final Cut Pro', 'Audio Production',
    'Podcast Production', 'Documentary Making', 'News Reporting'
  ],
  'Education': [
    'Curriculum Development', 'Lesson Planning', 'Educational Assessment',
    'Classroom Management', 'Child Psychology', 'Educational Technology',
    'Instructional Design', 'Special Education', 'Teaching Methods', 'Student Counseling',
    'Educational Research', 'Pedagogy', 'E-Learning', 'Educational Policy'
  ],
  'Agriculture & Environmental': [
    'Crop Science', 'Soil Science', 'Agricultural Economics', 'Farm Management',
    'Horticulture', 'Animal Husbandry', 'Agronomy', 'Sustainable Farming',
    'Environmental Impact Assessment', 'Conservation', 'Forestry', 'Ecology',
    'Climate Science', 'Water Management', 'Organic Farming', 'GIS'
  ],
  'Vocational & Polytechnic': [
    'Electrical Wiring', 'Plumbing', 'Welding', 'Carpentry', 'Automotive Repair',
    'HVAC', 'CNC Machining', 'Workshop Practice', 'Technical Drawing',
    'Machine Operation', 'Tool & Die Making', 'Industrial Maintenance',
    'Quality Control', 'Safety Procedures', 'Blueprint Reading'
  ],
  'Performing & Fine Arts': [
    'Acting', 'Dance', 'Theatre', 'Music Composition', 'Singing', 'Instrument Playing',
    'Choreography', 'Stage Management', 'Performance Art', 'Improvisation',
    'Classical Music', 'Contemporary Dance', 'Drama Direction', 'Music Theory',
    'Sound Engineering', 'Set Design'
  ],
  'Languages & Literature': [
    'Creative Writing', 'Poetry', 'Literary Criticism', 'Translation', 'Linguistics',
    'Grammar', 'Phonetics', 'Semantics', 'Comparative Literature', 'Technical Writing',
    'Editing', 'Proofreading', 'Foreign Languages', 'Language Teaching', 'Dialects'
  ],
  'Hospitality & Tourism': [
    'Hotel Management', 'Customer Service', 'Event Planning', 'Food & Beverage',
    'Travel Planning', 'Tour Operations', 'Front Office Management', 'Housekeeping',
    'Culinary Arts', 'Restaurant Management', 'Hospitality Marketing', 'Guest Relations',
    'Tourism Management', 'Cruise Operations', 'Resort Management'
  ],
  'Pharmacy': [
    'Pharmacology', 'Drug Formulation', 'Pharmaceutical Chemistry', 'Pharmacokinetics',
    'Clinical Pharmacy', 'Hospital Pharmacy', 'Drug Dispensing', 'Medication Management',
    'Pharmaceutical Analysis', 'Drug Interactions', 'Regulatory Affairs', 'Quality Assurance',
    'Pharmaceutical Marketing', 'Compounding', 'Toxicology'
  ],
  'Nursing': [
    'Patient Care', 'Medical Procedures', 'Wound Care', 'IV Administration',
    'Vital Signs Monitoring', 'Emergency Care', 'Pediatric Nursing', 'Geriatric Care',
    'Critical Care', 'Community Health', 'Nursing Ethics', 'Clinical Documentation',
    'Infection Control', 'Patient Education', 'Healthcare Coordination'
  ],
  'Dentistry': [
    'Dental Procedures', 'Oral Surgery', 'Orthodontics', 'Periodontology', 'Endodontics',
    'Prosthodontics', 'Dental Radiology', 'Preventive Dentistry', 'Oral Pathology',
    'Dental Materials', 'Clinical Examination', 'Patient Management', 'Dental Hygiene',
    'Cosmetic Dentistry', 'Dental Laboratory'
  ],
  'Allied Health': [
    'Physical Therapy', 'Occupational Therapy', 'Respiratory Therapy', 'Radiography',
    'Medical Laboratory', 'Speech Therapy', 'Nutrition & Dietetics', 'Medical Imaging',
    'Diagnostic Testing', 'Rehabilitation', 'Health Assessment', 'Clinical Skills',
    'Patient Counseling', 'Health Promotion', 'Medical Equipment'
  ],
  'Mathematics & Statistics': [
    'Calculus', 'Linear Algebra', 'Differential Equations', 'Number Theory',
    'Probability Theory', 'Statistical Inference', 'Mathematical Modeling',
    'Computational Mathematics', 'Data Analysis', 'R Programming', 'Python for Stats',
    'MATLAB', 'Time Series Analysis', 'Regression Analysis', 'Operations Research'
  ],
  'Economics': [
    'Microeconomics', 'Macroeconomics', 'Econometrics', 'Economic Theory',
    'Development Economics', 'International Economics', 'Financial Economics',
    'Economic Policy', 'Quantitative Analysis', 'Economic Modeling', 'Stata',
    'Economic Research', 'Behavioral Economics', 'Game Theory', 'Market Analysis'
  ],
  'Psychology': [
    'Counseling', 'Clinical Assessment', 'Psychological Testing', 'Therapy Techniques',
    'Child Psychology', 'Cognitive Psychology', 'Social Psychology', 'Neuropsychology',
    'Research Methods', 'Behavioral Analysis', 'Mental Health', 'Psychotherapy',
    'Psychological Research', 'Group Therapy', 'Crisis Intervention'
  ],
  'Sociology': [
    'Social Research', 'Community Studies', 'Social Theory', 'Qualitative Methods',
    'Survey Research', 'Urban Sociology', 'Rural Sociology', 'Social Movements',
    'Gender Studies', 'Caste & Class Analysis', 'Family Sociology', 'Cultural Sociology',
    'Social Policy', 'Development Studies', 'Social Change'
  ],
  'Political Science': [
    'Political Theory', 'Public Policy', 'International Relations', 'Governance',
    'Political Analysis', 'Comparative Politics', 'Public Administration',
    'Electoral Studies', 'Political Research', 'Policy Analysis', 'Diplomacy',
    'Political Communication', 'Constitutional Studies', 'Legislative Processes'
  ],
  'History': [
    'Historical Research', 'Archival Research', 'Historiography', 'Source Analysis',
    'Ancient History', 'Medieval History', 'Modern History', 'World History',
    'Regional History', 'Cultural History', 'Social History', 'Economic History',
    'Historical Writing', 'Museum Studies', 'Heritage Conservation'
  ],
  'Philosophy': [
    'Logic', 'Ethics', 'Metaphysics', 'Epistemology', 'Critical Thinking',
    'Philosophical Analysis', 'Ancient Philosophy', 'Modern Philosophy',
    'Indian Philosophy', 'Western Philosophy', 'Applied Ethics', 'Philosophy of Science',
    'Philosophical Writing', 'Argumentation', 'Moral Philosophy'
  ],
  'Physical Education & Sports Sciences': [
    'Coaching', 'Athletic Training', 'Sports Psychology', 'Exercise Physiology',
    'Biomechanics', 'Sports Nutrition', 'Kinesiology', 'Sports Management',
    'Physical Fitness', 'Sports Medicine', 'Performance Analysis', 'Strength Training',
    'Yoga Instruction', 'Sports Therapy', 'Rehabilitation'
  ],
  'Earth & Geological Sciences': [
    'Geology', 'Geophysics', 'Mineralogy', 'Paleontology', 'Seismology',
    'Petrology', 'Geochemistry', 'Oceanography', 'Meteorology', 'Climate Science',
    'GIS Mapping', 'Remote Sensing', 'Environmental Geology', 'Hydrology',
    'Geological Fieldwork', 'Rock Analysis'
  ],
  'Other': [
    'Interdisciplinary Research', 'Project Management', 'Communication',
    'Leadership', 'Teamwork', 'Problem Solving', 'Creative Thinking'
  ]
};

// Comprehensive interests library
export const INTERESTS_BY_STREAM: Record<typeof STREAMS[number], string[]> = {
  'Engineering & Technology': [
    'Innovation & Invention', 'Sustainable Engineering', 'Robotics Competitions',
    'Engineering Design', 'Product Development', 'Industrial Automation',
    'Renewable Energy', 'Smart Manufacturing', 'Engineering Ethics'
  ],
  'Computer Science & IT': [
    'Hackathons', 'Open Source', 'Tech Startups', 'AI Research', 'App Development',
    'Cybersecurity', 'Cloud Technologies', 'Gaming Development', 'Tech Communities'
  ],
  'Science': [
    'Scientific Research', 'Lab Experiments', 'Science Competitions', 'Innovation',
    'Space Science', 'Environmental Science', 'Science Communication', 'Science Policy'
  ],
  'Medicine & Health Sciences': [
    'Medical Research', 'Public Health', 'Patient Care', 'Medical Innovation',
    'Healthcare Policy', 'Global Health', 'Medical Technology', 'Clinical Trials'
  ],
  'Commerce & Business': [
    'Entrepreneurship', 'Stock Markets', 'Finance', 'Business Strategy', 'Marketing',
    'Case Competitions', 'Consulting', 'E-commerce', 'Business Analytics'
  ],
  'Arts': [
    'Gallery Exhibitions', 'Art Workshops', 'Contemporary Art', 'Art Movements',
    'Public Art', 'Art Criticism', 'Art Restoration', 'Digital Art'
  ],
  'Humanities': [
    'Literature', 'Critical Theory', 'Cultural Studies', 'Philosophical Debates',
    'Historical Research', 'Human Rights', 'Ethics & Morality', 'Comparative Studies'
  ],
  'Social Sciences': [
    'Social Justice', 'Community Development', 'Policy Research', 'Social Movements',
    'Cultural Anthropology', 'Urban Studies', 'Development Issues', 'Social Innovation'
  ],
  'Law': [
    'Legal Aid', 'Human Rights Law', 'Constitutional Law', 'Corporate Law',
    'Moot Courts', 'Legal Research', 'Policy Advocacy', 'Justice Reform'
  ],
  'Design & Architecture': [
    'Urban Design', 'Sustainable Architecture', 'Interior Design', 'Landscape Design',
    'Design Competitions', 'Heritage Conservation', 'Smart Cities', 'Green Buildings'
  ],
  'Media & Communication': [
    'Journalism', 'Film Making', 'Documentary', 'Digital Media', 'Broadcasting',
    'Content Creation', 'Media Ethics', 'Communication Research', 'Public Relations'
  ],
  'Education': [
    'Teaching Methods', 'Educational Reform', 'Child Development', 'Learning Technologies',
    'Educational Policy', 'Special Education', 'Curriculum Innovation', 'Student Welfare'
  ],
  'Agriculture & Environmental': [
    'Sustainable Farming', 'Environmental Conservation', 'Climate Action',
    'Organic Farming', 'Wildlife Conservation', 'Water Management', 'Eco-friendly Practices'
  ],
  'Vocational & Polytechnic': [
    'Technical Skills', 'Workshop Practice', 'Industrial Training', 'Skill Development',
    'Apprenticeships', 'Vocational Training', 'Technical Competitions', 'Craft Mastery'
  ],
  'Performing & Fine Arts': [
    'Theatre', 'Dance Performances', 'Music Concerts', 'Cultural Events',
    'Performance Art', 'Classical Arts', 'Contemporary Arts', 'Art Festivals'
  ],
  'Languages & Literature': [
    'Creative Writing', 'Literary Criticism', 'Poetry', 'Translation', 'Linguistics',
    'Language Learning', 'Literature Festivals', 'Publishing', 'Literary Magazines'
  ],
  'Hospitality & Tourism': [
    'Travel & Tourism', 'Culinary Arts', 'Event Management', 'Customer Experience',
    'Hotel Management', 'Food Culture', 'Tourism Development', 'Hospitality Innovation'
  ],
  'Pharmacy': [
    'Drug Development', 'Clinical Pharmacy', 'Pharmaceutical Research',
    'Medication Safety', 'Pharmaceutical Innovation', 'Healthcare Delivery'
  ],
  'Nursing': [
    'Patient Care Excellence', 'Community Health', 'Healthcare Quality',
    'Nursing Research', 'Emergency Nursing', 'Holistic Care', 'Nursing Leadership'
  ],
  'Dentistry': [
    'Oral Health', 'Dental Research', 'Cosmetic Dentistry', 'Preventive Dentistry',
    'Dental Technology', 'Community Dental Health', 'Dental Innovation'
  ],
  'Allied Health': [
    'Rehabilitation', 'Diagnostic Sciences', 'Health Technology', 'Patient Care',
    'Medical Research', 'Healthcare Innovation', 'Community Health Services'
  ],
  'Mathematics & Statistics': [
    'Mathematical Modeling', 'Data Science', 'Pure Mathematics', 'Applied Statistics',
    'Mathematical Competitions', 'Research in Mathematics', 'Computational Math'
  ],
  'Economics': [
    'Economic Policy', 'Development Economics', 'Financial Markets', 'Economic Research',
    'Behavioral Economics', 'International Economics', 'Economic Modeling'
  ],
  'Psychology': [
    'Mental Health', 'Behavioral Science', 'Counseling', 'Psychological Research',
    'Clinical Psychology', 'Social Psychology', 'Child Psychology', 'Therapy Practices'
  ],
  'Sociology': [
    'Social Justice', 'Community Research', 'Social Change', 'Cultural Studies',
    'Development Studies', 'Social Movements', 'Urban Sociology', 'Social Policy'
  ],
  'Political Science': [
    'Governance', 'Public Policy', 'International Relations', 'Political Movements',
    'Electoral Studies', 'Policy Research', 'Diplomacy', 'Political Reform'
  ],
  'History': [
    'Historical Research', 'Heritage Conservation', 'Archival Studies', 'Cultural History',
    'Ancient Civilizations', 'Historical Writing', 'Museum Studies', 'Local History'
  ],
  'Philosophy': [
    'Philosophical Inquiry', 'Ethics', 'Logic', 'Critical Thinking', 'Moral Philosophy',
    'Philosophical Debates', 'Applied Philosophy', 'Philosophy of Science'
  ],
  'Physical Education & Sports Sciences': [
    'Sports Performance', 'Athletic Development', 'Sports Management', 'Fitness Training',
    'Sports Psychology', 'Athletic Coaching', 'Sports Biomechanics', 'Youth Sports'
  ],
  'Earth & Geological Sciences': [
    'Geological Research', 'Climate Studies', 'Environmental Geology', 'Paleontology',
    'Seismic Studies', 'Oceanographic Research', 'Geological Surveys', 'Earth Sciences'
  ],
  'Other': [
    'Interdisciplinary Learning', 'Cross-field Collaboration', 'Lifelong Learning',
    'Knowledge Exchange', 'Academic Exploration', 'Research & Innovation'
  ]
};

// Comprehensive General Skills (Cross-disciplinary)
export const GENERAL_SKILLS_OPTIONS = [
  // Communication & Language
  'Public Speaking', 'Presentation Skills', 'Communication', 'Writing', 'Technical Writing',
  'Content Writing', 'Report Writing', 'Email Communication', 'Interpersonal Skills',
  'Active Listening', 'Negotiation', 'Persuasion', 'Storytelling',
  
  // Leadership & Management
  'Leadership', 'Team Management', 'Project Management', 'Time Management',
  'Conflict Resolution', 'Decision Making', 'Strategic Planning', 'People Management',
  'Delegation', 'Mentoring', 'Coaching', 'Change Management',
  
  // Technical & Digital
  'Microsoft Office', 'Excel', 'PowerPoint', 'Google Suite', 'Data Entry',
  'Typing Speed', 'Internet Research', 'Digital Literacy', 'Email Management',
  'Online Collaboration Tools', 'Virtual Communication', 'Social Media Management',
  
  // Creative & Design
  'Creativity', 'Innovation', 'Design Thinking', 'Visual Design', 'UI/UX Design',
  'Graphic Design', 'Video Editing', 'Photo Editing', 'Content Creation',
  'Brand Design', 'Creative Problem Solving',
  
  // Analytical & Problem Solving
  'Critical Thinking', 'Analytical Skills', 'Problem Solving', 'Research Skills',
  'Data Analysis', 'Logical Reasoning', 'Strategic Thinking', 'Systems Thinking',
  
  // Organizational & Administrative
  'Organization', 'Planning', 'Scheduling', 'Documentation', 'Record Keeping',
  'Event Planning', 'Event Management', 'Coordination', 'Multi-tasking',
  'Attention to Detail', 'Process Improvement', 'Quality Assurance',
  
  // Interpersonal & Soft Skills
  'Teamwork', 'Collaboration', 'Empathy', 'Emotional Intelligence', 'Adaptability',
  'Flexibility', 'Patience', 'Work Ethics', 'Professionalism', 'Customer Service',
  'Networking', 'Relationship Building', 'Cultural Sensitivity'
];

// General passions & hobbies (stream-agnostic)
export const PASSIONS_OPTIONS = [
  // Sports & Fitness
  'Cricket', 'Football', 'Basketball', 'Badminton', 'Tennis', 'Swimming', 'Running',
  'Gym & Fitness', 'Yoga', 'Martial Arts', 'Cycling', 'Table Tennis', 'Volleyball',
  'Athletics', 'Hockey', 'Kabaddi', 'Wrestling', 'Boxing', 'Weightlifting',
  'Marathon', 'Jogging', 'Aerobics', 'Zumba', 'Pilates', 'CrossFit', 'Skateboarding',
  'Skating', 'Archery', 'Shooting', 'Fencing', 'Rock Climbing', 'Bouldering',
  
  // Creative Arts
  'Photography', 'Painting', 'Drawing', 'Music', 'Dancing', 'Singing', 'Writing',
  'Poetry', 'Crafts', 'DIY Projects', 'Calligraphy', 'Graphic Design', 'Video Editing',
  'Sketching', 'Digital Art', 'Sculpture', 'Pottery', 'Origami', 'Knitting',
  'Embroidery', 'Jewelry Making', 'Woodworking', 'Leathercraft', 'Candle Making',
  
  // Cultural & Performing Arts
  'Theatre', 'Drama', 'Cultural Events', 'Literature', 'Reading', 'Book Clubs',
  'Film & Cinema', 'Stand-up Comedy', 'Debate', 'Public Speaking', 'Storytelling',
  'Classical Dance', 'Contemporary Dance', 'Street Dance', 'Hip Hop', 'Salsa',
  'Bharatanatyam', 'Kathak', 'Odissi', 'Kuchipudi', 'Mohiniyattam',
  'Instrument Playing', 'Guitar', 'Piano', 'Drums', 'Violin', 'Flute', 'Tabla',
  'Harmonium', 'Singing', 'Classical Music', 'Western Music', 'Folk Music',
  
  // Tech & Digital
  'Gaming', 'Coding', 'App Development', 'Blogging', 'Vlogging', 'Social Media',
  'Tech Gadgets', 'Open Source', 'Hackathons', 'Web Development', 'Mobile Gaming',
  'PC Gaming', 'E-Sports', 'Game Design', 'Animation', 'VFX', '3D Modeling',
  'Digital Marketing', 'SEO', 'Content Marketing', 'Podcasting', 'YouTube',
  
  // Nature & Adventure
  'Trekking', 'Hiking', 'Camping', 'Travel', 'Wildlife Photography', 'Wildlife',
  'Gardening', 'Environmental Conservation', 'Bird Watching', 'Mountain Climbing',
  'Backpacking', 'Adventure Sports', 'Paragliding', 'Skydiving', 'Bungee Jumping',
  'Scuba Diving', 'Snorkeling', 'Surfing', 'Rafting', 'Kayaking', 'Canoeing',
  'Nature Walks', 'Forest Bathing', 'Star Gazing', 'Astrophotography',
  
  // Community & Social Impact
  'Social Service', 'NGO Work', 'Community Development', 'Teaching', 'Mentoring',
  'Volunteering', 'Social Entrepreneurship', 'Activism', 'Environmental Activism',
  'Animal Welfare', 'Child Welfare', 'Elder Care', 'Disability Support',
  'Blood Donation', 'Organ Donation Awareness', 'Health Camps', 'Literacy Drives',
  'Rural Development', 'Women Empowerment', 'Youth Leadership',
  
  // Lifestyle & Entertainment
  'Cooking', 'Baking', 'Food Blogging', 'Fashion', 'Style', 'Interior Design', 'Collectibles',
  'Music Concerts', 'Festivals', 'Meditation', 'Spirituality', 'Mindfulness',
  'Wellness', 'Nutrition', 'Healthy Living', 'Minimalism', 'Sustainable Living',
  'Vintage Collecting', 'Coin Collection', 'Stamp Collection', 'Antiques',
  'Street Food', 'Cafe Hopping', 'Fine Dining', 'Wine Tasting', 'Coffee Brewing',
  
  // Intellectual & Learning
  'Quiz Competitions', 'Research', 'Innovation', 'Science Experiments', 'Astronomy',
  'History', 'Philosophy', 'Languages', 'Current Affairs', 'Puzzles', 'Chess',
  'Sudoku', 'Crosswords', 'Brain Games', 'Magic Tricks', 'Illusions',
  'Documentary Watching', 'TED Talks', 'Online Courses', 'Self Learning',
  'Foreign Language Learning', 'Sign Language', 'Coding Challenges',
  
  // Social & Entertainment
  'Partying', 'DJ-ing', 'Karaoke', 'Board Games', 'Card Games', 'Pool/Billiards',
  'Bowling', 'Ice Skating', 'Roller Skating', 'Amusement Parks', 'Theme Parks',
  'Escape Rooms', 'Virtual Reality', 'Cosplay', 'Comic Conventions',
  'Anime & Manga', 'Fantasy Sports', 'Sports Fandom', 'Memes & Humor'
];

// Student life activities (campus & social)
export const STUDENT_LIFE_OPTIONS = [
  // Campus Clubs & Organizations
  'Cultural Club', 'Drama Club', 'Music Club', 'Dance Club', 'Photography Club',
  'Literary Club', 'Debate Society', 'Quiz Club', 'Film Club', 'Art Club',
  
  // Academic & Professional
  'Coding Club', 'Robotics Club', 'Innovation Club', 'Entrepreneurship Cell',
  'Business Club', 'Finance Club', 'Consulting Club', 'Marketing Club',
  'Research Society', 'Science Club', 'Mathematics Society',
  
  // Sports & Fitness
  'Sports Team', 'Athletics', 'Gym Member', 'Yoga Club', 'Adventure Club',
  'Trekking Group', 'Cycling Club', 'Swimming Team', 'Martial Arts Club',
  
  // Social & Community
  'Social Service Club', 'NSS', 'NCC', 'Rotaract', 'Environmental Club',
  'Animal Welfare', 'Community Outreach', 'Blood Donation Drives',
  'Teach For Change', 'Rural Development',
  
  // Cultural & Arts
  'Cultural Committee', 'Event Management', 'Fest Organizing', 'Theatre Group',
  'Music Band', 'Dance Troupe', 'Fashion Society', 'Design Club',
  
  // Media & Communication
  'College Magazine', 'Newsletter', 'Campus Radio', 'Student Journalism',
  'Content Creation', 'Social Media Team', 'Public Relations',
  
  // Leadership & Governance
  'Student Council', 'Class Representative', 'Hostel Committee', 'Placement Cell',
  'Alumni Relations', 'Mentorship Programs', 'Peer Counseling',
  
  // Special Interest
  'Gaming Club', 'Book Club', 'Language Club', 'Philosophy Club',
  'Astronomy Club', 'Psychology Society', 'Law Society', 'Medical Society'
];

// Course suggestions by stream
export const COURSE_OPTIONS_BY_STREAM: Record<typeof STREAMS[number], string[]> = {
  'Engineering & Technology': [
    'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering',
    'Electronics Engineering', 'Chemical Engineering', 'Aerospace Engineering',
    'Automobile Engineering', 'Industrial Engineering', 'Production Engineering'
  ],
  'Computer Science & IT': [
    'Computer Science', 'Information Technology', 'Software Engineering',
    'Data Science', 'Artificial Intelligence', 'Cyber Security', 'Computer Applications'
  ],
  'Science': [
    'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Statistics',
    'Biotechnology', 'Microbiology', 'Biochemistry', 'Zoology', 'Botany'
  ],
  'Medicine & Health Sciences': [
    'MBBS', 'BDS', 'BAMS', 'BHMS', 'Physiotherapy', 'Occupational Therapy',
    'Medical Laboratory', 'Radiology', 'Anesthesia', 'Public Health'
  ],
  'Commerce & Business': [
    'B.Com', 'BBA', 'BBM', 'Accounting', 'Finance', 'Banking', 'Insurance',
    'Business Economics', 'International Business', 'E-Commerce'
  ],
  'Arts': [
    'Fine Arts', 'Applied Arts', 'Visual Arts', 'Painting', 'Sculpture',
    'Photography', 'Digital Arts', 'Graphic Design', 'Animation'
  ],
  'Humanities': [
    'English', 'Hindi', 'Sanskrit', 'Philosophy', 'Religious Studies',
    'Cultural Studies', 'Liberal Arts', 'Humanities'
  ],
  'Social Sciences': [
    'Sociology', 'Anthropology', 'Social Work', 'Development Studies',
    'Gender Studies', 'Urban Studies', 'Rural Studies'
  ],
  'Law': [
    'LLB', 'BA LLB', 'BBA LLB', 'BCom LLB', 'Corporate Law',
    'Criminal Law', 'Constitutional Law', 'Intellectual Property Law'
  ],
  'Design & Architecture': [
    'Architecture', 'Interior Design', 'Urban Planning', 'Landscape Architecture',
    'Industrial Design', 'Fashion Design', 'Textile Design', 'Product Design'
  ],
  'Media & Communication': [
    'Mass Communication', 'Journalism', 'Advertising', 'Public Relations',
    'Film Studies', 'Media Studies', 'Broadcasting', 'Digital Media'
  ],
  'Education': [
    'B.Ed', 'D.El.Ed', 'Early Childhood Education', 'Special Education',
    'Physical Education', 'Educational Psychology', 'Educational Technology'
  ],
  'Agriculture & Environmental': [
    'Agriculture', 'Horticulture', 'Forestry', 'Agricultural Economics',
    'Environmental Science', 'Agricultural Engineering', 'Dairy Technology'
  ],
  'Vocational & Polytechnic': [
    'Diploma Engineering', 'ITI', 'Polytechnic', 'Vocational Training',
    'Skill Development', 'Technical Courses', 'Trade Courses'
  ],
  'Performing & Fine Arts': [
    'Music', 'Dance', 'Theatre', 'Drama', 'Performing Arts',
    'Classical Music', 'Hindustani Music', 'Carnatic Music', 'Instrumental Music'
  ],
  'Languages & Literature': [
    'English Literature', 'Hindi Literature', 'Linguistics', 'Comparative Literature',
    'Foreign Languages', 'Translation Studies', 'Creative Writing'
  ],
  'Hospitality & Tourism': [
    'Hotel Management', 'Tourism Management', 'Culinary Arts',
    'Hospitality Management', 'Event Management', 'Travel & Tourism'
  ],
  'Pharmacy': [
    'B.Pharm', 'D.Pharm', 'Pharm.D', 'Pharmaceutical Sciences',
    'Pharmacology', 'Pharmaceutical Chemistry'
  ],
  'Nursing': [
    'B.Sc Nursing', 'GNM', 'Post Basic Nursing', 'Critical Care Nursing',
    'Pediatric Nursing', 'Community Health Nursing'
  ],
  'Dentistry': [
    'BDS', 'Dental Hygiene', 'Dental Technology', 'Oral Surgery',
    'Orthodontics', 'Periodontics'
  ],
  'Allied Health': [
    'Medical Lab Technology', 'Radiology', 'Physiotherapy', 'Occupational Therapy',
    'Speech Therapy', 'Nutrition & Dietetics', 'Optometry'
  ],
  'Mathematics & Statistics': [
    'Mathematics', 'Statistics', 'Applied Mathematics', 'Actuarial Science',
    'Mathematical Statistics', 'Operations Research'
  ],
  'Economics': [
    'Economics', 'Business Economics', 'Applied Economics',
    'Development Economics', 'Econometrics', 'Financial Economics'
  ],
  'Psychology': [
    'Psychology', 'Clinical Psychology', 'Counseling Psychology',
    'Applied Psychology', 'Educational Psychology', 'Organizational Psychology'
  ],
  'Sociology': [
    'Sociology', 'Social Work', 'Rural Sociology', 'Urban Sociology',
    'Industrial Sociology', 'Development Sociology'
  ],
  'Political Science': [
    'Political Science', 'Public Administration', 'International Relations',
    'Governance', 'Policy Studies', 'Comparative Politics'
  ],
  'History': [
    'History', 'Ancient History', 'Medieval History', 'Modern History',
    'World History', 'Art History', 'Historiography'
  ],
  'Philosophy': [
    'Philosophy', 'Ethics', 'Logic', 'Indian Philosophy',
    'Western Philosophy', 'Philosophy of Science', 'Moral Philosophy'
  ],
  'Physical Education & Sports Sciences': [
    'Physical Education', 'Sports Science', 'Exercise Science', 'Sports Management',
    'Athletic Training', 'Kinesiology', 'Sports Coaching', 'Fitness Studies'
  ],
  'Earth & Geological Sciences': [
    'Geology', 'Geophysics', 'Earth Sciences', 'Geochemistry',
    'Environmental Geology', 'Applied Geology', 'Marine Geology', 'Paleontology'
  ],
  'Other': [
    'Interdisciplinary Studies', 'Liberal Studies', 'General Studies',
    'Integrated Programs', 'Dual Degree', 'Custom Programs'
  ]
};

// Get all unique skills across streams
export const ALL_SKILLS = Array.from(
  new Set(Object.values(SKILLS_BY_STREAM).flat())
).sort();

// Get all unique interests across streams
export const ALL_INTERESTS = Array.from(
  new Set(Object.values(INTERESTS_BY_STREAM).flat())
).sort();

// Get all unique courses across streams
export const ALL_COURSES = Array.from(
  new Set(Object.values(COURSE_OPTIONS_BY_STREAM).flat())
).sort();

// Helper function to get options for a specific stream
export function getStreamOptions(stream: typeof STREAMS[number]) {
  return {
    skills: SKILLS_BY_STREAM[stream] || [],
    interests: INTERESTS_BY_STREAM[stream] || [],
    courses: COURSE_OPTIONS_BY_STREAM[stream] || []
  };
}

// Helper function to get suggested sub-streams based on primary stream
export function getSubStreamSuggestions(primaryStream: typeof STREAMS[number]): string[] {
  // Return other related streams as suggestions for sub-streams
  const relatedStreams: Record<string, string[]> = {
    'Engineering & Technology': ['Computer Science & IT', 'Design & Architecture'],
    'Computer Science & IT': ['Engineering & Technology', 'Mathematics & Statistics'],
    'Science': ['Mathematics & Statistics', 'Medicine & Health Sciences', 'Agriculture & Environmental'],
    'Medicine & Health Sciences': ['Science', 'Pharmacy', 'Nursing', 'Allied Health'],
    'Commerce & Business': ['Economics', 'Mathematics & Statistics'],
    'Arts': ['Design & Architecture', 'Performing & Fine Arts', 'Media & Communication'],
    'Humanities': ['Social Sciences', 'Languages & Literature', 'Philosophy', 'History'],
    'Social Sciences': ['Humanities', 'Psychology', 'Sociology', 'Political Science'],
    'Law': ['Political Science', 'Humanities', 'Social Sciences'],
    'Design & Architecture': ['Arts', 'Engineering & Technology'],
    'Media & Communication': ['Arts', 'Languages & Literature'],
    'Education': ['Psychology', 'Social Sciences', 'Humanities']
  };
  
  return relatedStreams[primaryStream] || [];
}

// Comprehensive Combined Options (includes all sources)
export const SKILLS_OPTIONS = Array.from(new Set([...ALL_SKILLS, ...GENERAL_SKILLS_OPTIONS])).sort();
export const INTERESTS_OPTIONS = Array.from(new Set([...ALL_INTERESTS])).sort();
export const COURSE_OPTIONS = ALL_COURSES;

export const COLLEGES_OPTIONS = [
  // Placeholder - these would typically come from a database or API
  "Indian Institute of Technology (IIT)", "Indian Institute of Science (IISc)", 
  "Indian Institute of Management (IIM)", "National Institute of Technology (NIT)",
  "Birla Institute of Technology and Science (BITS)", "University of Delhi",
  "Jawaharlal Nehru University (JNU)", "Banaras Hindu University (BHU)",
  "Jamia Millia Islamia", "Aligarh Muslim University (AMU)", "Anna University",
  "Indian Statistical Institute (ISI)", "Jadavpur University", "University of Mumbai",
  "Pune University", "Christ University", "Manipal University", "Amity University",
  "SRM University", "VIT University", "Lovely Professional University",
  // International
  "MIT", "Stanford University", "Harvard University", "Oxford University", 
  "Cambridge University", "University of Toronto", "Other"
];
