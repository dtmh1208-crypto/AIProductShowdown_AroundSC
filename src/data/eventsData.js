import { CAMPUS_LOCATIONS } from './campusLocations.js';
import { campusDateParts } from '../utils/discoveryParser.js';
import { campusTimeToIso } from '../utils/calendar.js';

// Helper to construct dynamic dates relative to today so the demo is always fresh
const now = new Date();
const todayStr = campusDateParts(now).date;

const addDays = (days) => {
  const d = new Date(`${todayStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

const createTimestamp = (dateStr, hour, minute = 0) => campusTimeToIso(dateStr, hour, minute);

// Compute dynamic times for "Happening Now"


// An event that started 30 mins ago and ends in 1 hour
const liveStart1 = new Date(now.getTime() - 35 * 60 * 1000).toISOString();
const liveEnd1 = new Date(now.getTime() + 55 * 60 * 1000).toISOString();

// Another live event
const liveStart2 = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
const liveEnd2 = new Date(now.getTime() + 105 * 60 * 1000).toISOString();

// A third live event in central campus
const liveStart3 = new Date(now.getTime() - 50 * 60 * 1000).toISOString();
const liveEnd3 = new Date(now.getTime() + 40 * 60 * 1000).toISOString();

export const RAW_EVENTS = [
  // --- HAPPENING NOW (LIVE) ---
  {
    id: 'evt-01',
    title: 'Viterbi AI Lab Showcase & Demo Night',
    organizer: 'USC Viterbi School of Engineering & ACM',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.RTH,
    room: 'RTH 105 / E-Quad',
    startTime: liveStart1,
    endTime: liveEnd1,
    freeFood: true,
    foodDescription: 'Free In-N-Out Burgers & Boba for first 150 attendees',
    description: 'Explore live generative AI demos, robotics projects, and deep learning research led by USC Viterbi PhDs and undergraduate research teams. Walk-ins welcome!',
    tags: ['Artificial Intelligence', 'Engineering', 'Free Food', 'Demos'],
    attendeesCount: 142,
    externalUrl: 'https://viterbischool.usc.edu',
    featured: true
  },
  {
    id: 'evt-02',
    title: 'USC Program Board Fall Lawn Games & Chillout',
    organizer: 'USC Undergraduate Student Government',
    category: 'Social',
    location: CAMPUS_LOCATIONS.HAHN,
    room: 'Hahn Plaza Lawn (Tommy Trojan)',
    startTime: liveStart2,
    endTime: liveEnd2,
    freeFood: true,
    foodDescription: 'Free churros and iced matcha latte bar',
    description: 'Take a midterm break by Tommy Trojan! Giant Jenga, spikeball, cornhole, live student DJ, and free giveaways. Open to all USC students with Trojan ID.',
    tags: ['Social', 'Lawn Games', 'Free Food', 'Music'],
    attendeesCount: 210,
    externalUrl: 'https://engage.usc.edu',
    featured: true
  },
  {
    id: 'evt-03',
    title: 'Marshall Venture Capital Pitch Feedback Office Hours',
    organizer: 'USC Marshall Greif Center for Entrepreneurship',
    category: 'Career',
    location: CAMPUS_LOCATIONS.JFF,
    room: 'Fertitta Hall Room 202',
    startTime: liveStart3,
    endTime: liveEnd3,
    freeFood: false,
    foodDescription: '',
    description: 'Drop in for 10-minute speed feedback on your pitch deck from visiting LA venture capitalists and Marshall alumni mentors. Bring your one-pager or slide deck.',
    tags: ['Startups', 'Venture Capital', 'Networking'],
    attendeesCount: 48,
    externalUrl: 'https://www.marshall.usc.edu',
    featured: false
  },

  // --- TODAY: UPCOMING AFTERNOON & EVENING ---
  {
    id: 'evt-04',
    title: 'Tutor Campus Center Pop-Up Farmer Market & Craft Fair',
    organizer: 'USC Hospitality & Environmental Student Assembly',
    category: 'Social',
    location: CAMPUS_LOCATIONS.TCC,
    room: 'Central Courtyard & Piazza',
    startTime: createTimestamp(todayStr, 14, 0), // 2:00 PM (conflicts with MW CSCI 104)
    endTime: createTimestamp(todayStr, 17, 30),
    freeFood: true,
    foodDescription: 'Free organic fruit tastings and local bakery samples',
    description: 'Local Southern California farm vendors, honey producers, artisan bakers, and handcrafted goods right in the heart of TCC. Live acoustic music sets.',
    tags: ['Farmers Market', 'Sustainability', 'TCC'],
    attendeesCount: 380,
    externalUrl: 'https://hospitality.usc.edu',
    featured: true
  },
  {
    id: 'evt-05',
    title: 'CSCI 104 & 201 Peer Mentoring and Code Jam',
    organizer: 'USC UPE Computer Science Honor Society',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.SAL,
    room: 'SAL Computer Lab 126',
    startTime: createTimestamp(todayStr, 14, 30), // 2:30 PM (conflicts with CSCI 104)
    endTime: createTimestamp(todayStr, 16, 0),
    freeFood: true,
    foodDescription: 'Pizza and Red Bull provided',
    description: 'Hands-on debugging help, memory leaks breakdown in C++, and mock coding interview problem walkthroughs with TA alumni.',
    tags: ['Coding', 'CS', 'Algorithms', 'Peer Tutoring'],
    attendeesCount: 65,
    externalUrl: 'https://upe.usc.edu',
    featured: false
  },
  {
    id: 'evt-06',
    title: 'USC Trojan Esports Super Smash Bros Tournament',
    organizer: 'Trojan Esports & Gaming Club',
    category: 'Athletics',
    location: CAMPUS_LOCATIONS.TCC,
    room: 'TCC Basement Lounge',
    startTime: createTimestamp(todayStr, 18, 0),
    endTime: createTimestamp(todayStr, 21, 30),
    freeFood: true,
    foodDescription: 'Monster energy drinks, snacks, and pizza',
    description: 'Double-elimination bracket on 8 tournament setups. $200 prize pool in campus bookstore gift cards. Controller rentals available.',
    tags: ['Esports', 'Gaming', 'Tournament', 'TCC'],
    attendeesCount: 92,
    externalUrl: 'https://engage.usc.edu',
    featured: false
  },
  {
    id: 'evt-07',
    title: 'Annenberg Media Workshop: Investigative Podcast Production',
    organizer: 'Annenberg School for Communication and Journalism',
    category: 'Workshop',
    location: CAMPUS_LOCATIONS.ANN,
    room: 'Media Center Suite 102',
    startTime: createTimestamp(todayStr, 16, 0),
    endTime: createTimestamp(todayStr, 17, 45),
    freeFood: false,
    foodDescription: '',
    description: 'Learn pro audio editing, dynamic microphone positioning, and narrative storytelling with award-winning NPR and LAist audio journalists.',
    tags: ['Audio', 'Journalism', 'Podcasting', 'Annenberg'],
    attendeesCount: 35,
    externalUrl: 'https://annenberg.usc.edu',
    featured: false
  },
  {
    id: 'evt-08',
    title: 'USC Symphony Orchestra Open Rehearsal: Beethoven Symphony No. 7',
    organizer: 'Thornton School of Music',
    category: 'Arts',
    location: CAMPUS_LOCATIONS.BOVARD,
    room: 'Bovard Main Hall Stage',
    startTime: createTimestamp(todayStr, 19, 0),
    endTime: createTimestamp(todayStr, 21, 0),
    freeFood: false,
    foodDescription: '',
    description: 'Free admission for USC students! Experience maestro Carl St.Clair leading the premier Thornton Symphony Orchestra in open rehearsal.',
    tags: ['Music', 'Orchestra', 'Bovard', 'Classical'],
    attendeesCount: 180,
    externalUrl: 'https://music.usc.edu',
    featured: false
  },
  {
    id: 'evt-09',
    title: 'Trojan Fitness HIIT & Core Sunset Bootcamp',
    organizer: 'USC Recreational Sports',
    category: 'Athletics',
    location: CAMPUS_LOCATIONS.LYON,
    room: 'Lyon Center Rooftop / Turf Field',
    startTime: createTimestamp(todayStr, 17, 30),
    endTime: createTimestamp(todayStr, 18, 30),
    freeFood: false,
    foodDescription: '',
    description: 'High intensity interval training with upbeat music and skyline views of Downtown LA. All fitness levels welcome. Bring workout shoes and water.',
    tags: ['Fitness', 'Workout', 'Lyon Center', 'Cardio'],
    attendeesCount: 45,
    externalUrl: 'https://recsports.usc.edu',
    featured: false
  },
  {
    id: 'evt-10',
    title: 'Late Night Study Jam & Coffee Bar',
    organizer: 'USC Libraries & Late Night Trojans',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.LVL,
    room: 'Leavey Library Ground Floor Collaborative Zone',
    startTime: createTimestamp(todayStr, 20, 0),
    endTime: createTimestamp(todayStr, 23, 59),
    freeFood: true,
    foodDescription: 'Free cold brew, drip coffee, hot chocolate, and pastry donuts',
    description: 'Collaborative quiet study floor open 24/7. Peer research librarians available for citations, literature search, and LaTeX formatting assistance.',
    tags: ['Study', 'Leavey', 'Free Coffee', 'Late Night'],
    attendeesCount: 310,
    externalUrl: 'https://libraries.usc.edu',
    featured: true
  },

  // --- TOMORROW: DAY + 1 ---
  {
    id: 'evt-11',
    title: 'USC Tech & Software Engineering Career Fair Meetup',
    organizer: 'Viterbi Career Connections & USC Career Center',
    category: 'Career',
    location: CAMPUS_LOCATIONS.TCC,
    room: 'TCC Ballroom ABC',
    startTime: createTimestamp(addDays(1), 10, 30), // conflicts with TR BUAD 304!
    endTime: createTimestamp(addDays(1), 15, 0),
    freeFood: true,
    foodDescription: 'Catered gourmet box lunches for registered student attendees',
    description: 'Connect directly with recruiters and engineering leaders from Google, Apple, Microsoft, SpaceX, Riot Games, and fast-growing LA startups.',
    tags: ['Career Fair', 'Software Engineering', 'Internships', 'Jobs'],
    attendeesCount: 520,
    externalUrl: 'https://careers.usc.edu',
    featured: true
  },
  {
    id: 'evt-12',
    title: 'Trojan Blockchain & Web3 Builder Summit',
    organizer: 'Blockchain@USC',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.EQUAD,
    room: 'Epstein Plaza Canopy Tent',
    startTime: createTimestamp(addDays(1), 11, 0), // conflicts with TR BUAD 304 & MWF Math 225
    endTime: createTimestamp(addDays(1), 14, 0),
    freeFood: true,
    foodDescription: 'Taco truck vouchers provided to all RSVP participants',
    description: 'Keynotes on zero-knowledge cryptography, decentralized physical infrastructure networks, and crypto venture capital. Free swag bags.',
    tags: ['Blockchain', 'Web3', 'Tech', 'Free Food'],
    attendeesCount: 160,
    externalUrl: 'https://blockchainusc.com',
    featured: false
  },
  {
    id: 'evt-13',
    title: 'USC Women in Business Annual Networking Brunch',
    organizer: 'USC Marshall Women in Business',
    category: 'Career',
    location: CAMPUS_LOCATIONS.JFF,
    room: 'Fertitta Hall 5th Floor Terrace',
    startTime: createTimestamp(addDays(1), 11, 30),
    endTime: createTimestamp(addDays(1), 13, 30),
    freeFood: true,
    foodDescription: 'Gourmet brunch buffet: avocado toast, croissants, fresh juices',
    description: 'Empowering undergraduate women through mentorship, executive panels in consulting and finance, and meaningful peer connections.',
    tags: ['Networking', 'Marshall', 'Brunch', 'Leadership'],
    attendeesCount: 110,
    externalUrl: 'https://marshallwib.com',
    featured: false
  },
  {
    id: 'evt-14',
    title: 'School of Dramatic Arts Scene Showcase',
    organizer: 'USC School of Dramatic Arts',
    category: 'Arts',
    location: CAMPUS_LOCATIONS.BING,
    room: 'Bing Theatre Main Stage',
    startTime: createTimestamp(addDays(1), 19, 30),
    endTime: createTimestamp(addDays(1), 21, 30),
    freeFood: false,
    foodDescription: '',
    description: 'Showcasing contemporary scene work directed by senior MFA directing candidates featuring BFA acting students. Free student rush tickets.',
    tags: ['Theatre', 'Acting', 'Bing Theatre', 'Drama'],
    attendeesCount: 140,
    externalUrl: 'https://dramaticarts.usc.edu',
    featured: false
  },
  {
    id: 'evt-15',
    title: 'Trojan Basketball Open Scrimmage & Spirit Rally',
    organizer: 'USC Athletics & Trojan Spirit Leaders',
    category: 'Athletics',
    location: CAMPUS_LOCATIONS.GALEN,
    room: 'Galen Center Arena Floor',
    startTime: createTimestamp(addDays(1), 18, 0),
    endTime: createTimestamp(addDays(1), 20, 0),
    freeFood: true,
    foodDescription: 'Free hot dogs, nachos, and commemorative rally towels',
    description: 'Get pumped for Pac-12 / Big Ten action! Watch the men and women basketball teams scrimmage, enter the half-court shot contest, and win prizes.',
    tags: ['Basketball', 'Athletics', 'Galen Center', 'Spirit'],
    attendeesCount: 600,
    externalUrl: 'https://usctrojans.com',
    featured: true
  },
  {
    id: 'evt-16',
    title: 'USC Village Sunset Yoga on the Green',
    organizer: 'USC Wellness Affairs',
    category: 'Social',
    location: CAMPUS_LOCATIONS.VILLAGE,
    room: 'USC Village Central Piazza Lawn',
    startTime: createTimestamp(addDays(1), 17, 30),
    endTime: createTimestamp(addDays(1), 18, 30),
    freeFood: true,
    foodDescription: 'Complimentary green smoothies from SunLife Organics',
    description: 'Unwind under the Hecuba statue with a gentle vinyasa flow yoga session. Yoga mats provided on a first-come, first-served basis.',
    tags: ['Yoga', 'Wellness', 'USC Village', 'Mindfulness'],
    attendeesCount: 85,
    externalUrl: 'https://wellness.usc.edu',
    featured: false
  },

  // --- DAY + 2 ---
  {
    id: 'evt-17',
    title: 'USC Center for AI in Society (CAIS) Public Lecture',
    organizer: 'USC CAIS & Suzanne Dworak-Peck School of Social Work',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.ANN,
    room: 'Annenberg Auditorium G02',
    startTime: createTimestamp(addDays(2), 14, 0), // conflicts with MW CSCI 104
    endTime: createTimestamp(addDays(2), 15, 30),
    freeFood: true,
    foodDescription: 'Coffee, tea, and gourmet cookies',
    description: 'Dr. Milind Tambe discusses AI algorithms for social good: public health interventions, wildlife conservation, and fair housing allocation.',
    tags: ['AI', 'Social Good', 'Annenberg', 'Research'],
    attendeesCount: 95,
    externalUrl: 'https://cais.usc.edu',
    featured: false
  },
  {
    id: 'evt-18',
    title: 'Trojan Cinema Society: 35mm Rare Film Screening',
    organizer: 'USC School of Cinematic Arts (SCA)',
    category: 'Arts',
    location: CAMPUS_LOCATIONS.DML,
    room: 'Doheny Library Friends of the Library Lecture Hall',
    startTime: createTimestamp(addDays(2), 19, 0),
    endTime: createTimestamp(addDays(2), 21, 30),
    freeFood: true,
    foodDescription: 'Movie theater popcorn and vintage sodas',
    description: 'Archival 35mm projection screening followed by a Q&A with visiting cinematographers. Q&A explores color grading in modern cinema.',
    tags: ['Film', 'Cinema', 'SCA', 'Doheny'],
    attendeesCount: 75,
    externalUrl: 'https://cinema.usc.edu',
    featured: false
  },
  {
    id: 'evt-19',
    title: 'USC Solar Car & Formula Electric Garage Tour',
    organizer: 'USC Racing & Solar Car Team',
    category: 'Workshop',
    location: CAMPUS_LOCATIONS.RTH,
    room: 'Baum Family Maker Space / Machine Shop',
    startTime: createTimestamp(addDays(2), 16, 0),
    endTime: createTimestamp(addDays(2), 18, 0),
    freeFood: false,
    foodDescription: '',
    description: 'Tour USC student-built composite race cars, battery management systems, telemetry test rigs, and carbon fiber curing autoclaves.',
    tags: ['Formula SAE', 'Solar Car', 'Makerspace', 'Viterbi'],
    attendeesCount: 60,
    externalUrl: 'https://uscracing.com',
    featured: false
  },
  {
    id: 'evt-20',
    title: 'Trojan Debate Squad Exhibition Match: AI & Copyright',
    organizer: 'USC Annenberg Trojan Debate Squad',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.TCC,
    room: 'TCC Room 227 (The Forum)',
    startTime: createTimestamp(addDays(2), 18, 30),
    endTime: createTimestamp(addDays(2), 20, 0),
    freeFood: true,
    foodDescription: 'Mediterranean mezze platter and lemonade',
    description: 'Collegiate parliamentary debaters square off on intellectual property rights in the age of large multimodal foundation models.',
    tags: ['Debate', 'Copyright', 'AI Ethics', 'TCC'],
    attendeesCount: 70,
    externalUrl: 'https://annenberg.usc.edu',
    featured: false
  },

  // --- DAY + 3 ---
  {
    id: 'evt-21',
    title: 'Trojan Food Truck Festival & Live Music',
    organizer: 'USC Student Affairs',
    category: 'Social',
    location: CAMPUS_LOCATIONS.VILLAGE,
    room: 'USC Village Hoover Lawn',
    startTime: createTimestamp(addDays(3), 12, 0),
    endTime: createTimestamp(addDays(3), 16, 0),
    freeFood: true,
    foodDescription: 'First 300 students receive a $10 food truck voucher',
    description: 'Featuring 12 top Los Angeles food trucks (Kogi BBQ, Yeastie Boys Bagels, Prince Street Pizza, and more) plus student acoustic acts.',
    tags: ['Food Trucks', 'Festival', 'USC Village', 'Live Music'],
    attendeesCount: 750,
    externalUrl: 'https://engage.usc.edu',
    featured: true
  },
  {
    id: 'evt-22',
    title: 'Women in Computing (ACM-W) Hack & Chill Study Group',
    organizer: 'ACM-W at USC',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.SAL,
    room: 'SAL CS Lounge 2nd Floor',
    startTime: createTimestamp(addDays(3), 15, 0),
    endTime: createTimestamp(addDays(3), 17, 30),
    freeFood: true,
    foodDescription: 'Boba Guys milk tea & pastries',
    description: 'Study session for midterms, resume critiques for grace hopper conference attendees, and friendly LeetCode practice rounds.',
    tags: ['ACM-W', 'Women In Tech', 'LeetCode', 'CS'],
    attendeesCount: 50,
    externalUrl: 'https://acmwusc.org',
    featured: false
  },
  {
    id: 'evt-23',
    title: 'USC Thornton Jazz Combos Sunset Courtyard Concert',
    organizer: 'Thornton Jazz Studies Department',
    category: 'Arts',
    location: CAMPUS_LOCATIONS.TCC,
    room: 'TCC Courtyard Stage',
    startTime: createTimestamp(addDays(3), 17, 0),
    endTime: createTimestamp(addDays(3), 19, 0),
    freeFood: false,
    foodDescription: '',
    description: 'Award-winning Thornton jazz combos perform post-bop, Afro-Cuban, and fusion standards as the sun sets over UPC.',
    tags: ['Jazz', 'Concert', 'Live Music', 'TCC'],
    attendeesCount: 160,
    externalUrl: 'https://music.usc.edu',
    featured: false
  },
  {
    id: 'evt-24',
    title: 'Trojan Club Water Polo vs UCLA Alumni Match',
    organizer: 'USC Rec Sports Club Water Polo',
    category: 'Athletics',
    location: CAMPUS_LOCATIONS.LYON,
    room: 'Uytengsu Aquatics Center',
    startTime: createTimestamp(addDays(3), 14, 0),
    endTime: createTimestamp(addDays(3), 16, 0),
    freeFood: false,
    foodDescription: '',
    description: 'Rivalry clash in the Olympic diving and swimming pool! Come cheer on the Trojans against crosstown rivals. Free student admission.',
    tags: ['Water Polo', 'Aquatics', 'Athletics', 'Beat UCLA'],
    attendeesCount: 220,
    externalUrl: 'https://usctrojans.com',
    featured: false
  },

  // --- DAY + 4 ---
  {
    id: 'evt-25',
    title: 'Marshall Consulting & Case Interview Workshop',
    organizer: 'Trojan Consulting Group (TCG)',
    category: 'Career',
    location: CAMPUS_LOCATIONS.JFF,
    room: 'Fertitta Hall Room 310',
    startTime: createTimestamp(addDays(4), 10, 0), // conflicts with TR BUAD 304
    endTime: createTimestamp(addDays(4), 12, 0),
    freeFood: true,
    foodDescription: 'Breakfast pastries and cold brew',
    description: 'Learn profitability and market-entry frameworks from incoming McKinsey, BCG, and Bain associate consultants. Includes live mock cases.',
    tags: ['Consulting', 'Case Prep', 'Marshall', 'Career'],
    attendeesCount: 80,
    externalUrl: 'https://trojanconsulting.org',
    featured: false
  },
  {
    id: 'evt-26',
    title: 'USC Rocket Propulsion Lab (RPL) Avionics Assembly Workshop',
    organizer: 'USC RPL',
    category: 'Workshop',
    location: CAMPUS_LOCATIONS.RTH,
    room: 'RTH Basement Aerospace Lab',
    startTime: createTimestamp(addDays(4), 13, 0),
    endTime: createTimestamp(addDays(4), 16, 0),
    freeFood: false,
    foodDescription: '',
    description: 'Hands-on surface mount soldering and telemetry transmitter testing for RPL next-generation suborbital space shot rocket.',
    tags: ['Aerospace', 'Rocketry', 'Viterbi', 'Hardware'],
    attendeesCount: 40,
    externalUrl: 'https://uscrpl.com',
    featured: false
  },
  {
    id: 'evt-27',
    title: 'USC Environmental Health & Urban Forestry Tree Walk',
    organizer: 'USC Office of Sustainability & TreesSC',
    category: 'Social',
    location: CAMPUS_LOCATIONS.DML,
    room: 'Meet at Doheny Front Steps',
    startTime: createTimestamp(addDays(4), 15, 30),
    endTime: createTimestamp(addDays(4), 17, 0),
    freeFood: true,
    foodDescription: 'Free reusable stainless steel USC water bottles + fruit',
    description: 'Guided biodiversity walk exploring century-old sycamores, gingkos, and native flora on University Park Campus.',
    tags: ['Sustainability', 'Nature', 'Campus Walk'],
    attendeesCount: 45,
    externalUrl: 'https://green.usc.edu',
    featured: false
  },
  {
    id: 'evt-28',
    title: 'Trojan Scholars Society Game Night & Trivia',
    organizer: 'Trojan Scholars Society',
    category: 'Social',
    location: CAMPUS_LOCATIONS.TCC,
    room: 'TCC Rosen Family Screening Room',
    startTime: createTimestamp(addDays(4), 19, 0),
    endTime: createTimestamp(addDays(4), 21, 30),
    freeFood: true,
    foodDescription: 'Portos Cheese Rolls and Guava Pastries provided',
    description: 'Campus trivia showdown with categories ranging from USC history, pop culture, to STEM trivia. Trophy and merch prizes for top 3 teams.',
    tags: ['Trivia', 'Portos', 'Social', 'TCC'],
    attendeesCount: 110,
    externalUrl: 'https://engage.usc.edu',
    featured: false
  },

  // --- DAY + 5 ---
  {
    id: 'evt-29',
    title: 'USC Quantum Information Science Seminar',
    organizer: 'USC Center for Quantum Information Science & Technology (CQIST)',
    category: 'Academic',
    location: CAMPUS_LOCATIONS.SAL,
    room: 'SAL 322',
    startTime: createTimestamp(addDays(5), 11, 0), // conflicts with MWF Math 225
    endTime: createTimestamp(addDays(5), 12, 15),
    freeFood: false,
    foodDescription: '',
    description: 'Guest lecture on error-mitigated quantum circuits and superconducting qubit architectures with researchers from IBM Quantum.',
    tags: ['Quantum', 'Physics', 'Viterbi', 'Research'],
    attendeesCount: 55,
    externalUrl: 'https://cqist.usc.edu',
    featured: false
  },
  {
    id: 'evt-30',
    title: 'USC Trojan Marching Band Open Practice & Spirit Rally',
    organizer: 'USC Trojan Marching Band (The Spirit of Troy)',
    category: 'Arts',
    location: CAMPUS_LOCATIONS.HERITAGE,
    room: 'Cromwell Field & Heritage Hall Plaza',
    startTime: createTimestamp(addDays(5), 16, 0),
    endTime: createTimestamp(addDays(5), 17, 45),
    freeFood: false,
    foodDescription: '',
    description: 'Watch the greatest marching band in the history of the universe practice Tribute to Troy, Fight On, and halftime drill routines.',
    tags: ['Marching Band', 'Heritage Hall', 'Fight On', 'Tradition'],
    attendeesCount: 320,
    externalUrl: 'https://uscband.usc.edu',
    featured: true
  },
  {
    id: 'evt-31',
    title: 'Trojan Creators Club: iPhone Filmmaking Masterclass',
    organizer: 'USC SCA Student Industry Relations',
    category: 'Workshop',
    location: CAMPUS_LOCATIONS.ANN,
    room: 'Annenberg Hall Studio A',
    startTime: createTimestamp(addDays(5), 18, 0),
    endTime: createTimestamp(addDays(5), 20, 0),
    freeFood: true,
    foodDescription: 'Free pizza and craft sodas',
    description: 'Cinematography masterclass focusing on ProRes log video capture on mobile devices, ND filters, and fast mobile DaVinci Resolve workflows.',
    tags: ['Video', 'Filmmaking', 'Annenberg', 'Workshop'],
    attendeesCount: 65,
    externalUrl: 'https://annenberg.usc.edu',
    featured: false
  },
  {
    id: 'evt-32',
    title: 'Friday Night Spikeball & Spike-A-Thon for Charity',
    organizer: 'USC Roundnet Club & Trojan Philanthropy',
    category: 'Athletics',
    location: CAMPUS_LOCATIONS.HAHN,
    room: 'Hahn Plaza Grass Lawns',
    startTime: createTimestamp(addDays(5), 18, 30),
    endTime: createTimestamp(addDays(5), 21, 0),
    freeFood: true,
    foodDescription: 'Snacks, hydration drinks, and energy bars',
    description: '32-team charity spikeball tournament under the stadium floodlights. All entry fees support local South LA youth sports programs.',
    tags: ['Spikeball', 'Sports', 'Tommy Trojan', 'Charity'],
    attendeesCount: 90,
    externalUrl: 'https://engage.usc.edu',
    featured: false
  }
];
