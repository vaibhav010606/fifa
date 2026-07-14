// js/data.js - Comprehensive Data Dictionary for MatchPulse AI (FIFA World Cup 2026 Digital Twin)

export const STADIUM_METADATA = {
    name: "Olympic Stadium — FIFA World Cup 2026",
    matchTitle: "Match 42: Quarter-Final — Brazil vs. France",
    kickoffTime: "20:00 EST",
    capacity: 68400,
    currentAttendance: 59850,
    status: "LIVE EVENT",
    weather: "22°C Clear · Wind 8 km/h NE",
    securityLevel: "LEVEL 2 (ELEVATED)"
};

export const GATES_DATA = [
    { id: "GATE_A", label: "GATE A (North Main)", type: "gate", x: 145, z: 0, status: "Operational", flowRate: "92%", waitTime: "4 min", recommendation: "Optimal entry for Blocks B01-B08" },
    { id: "GATE_B", label: "GATE B (North-East)", type: "gate", x: 102.5, z: 102.5, status: "Operational", flowRate: "88%", waitTime: "6 min", recommendation: "Recommended for VIP & East lower tier" },
    { id: "GATE_C", label: "GATE C (East Main)", type: "gate", x: 0, z: 125, status: "Degraded", flowRate: "64%", waitTime: "18 min", recommendation: "High crowd volume - Consider redirecting to Gate D" },
    { id: "GATE_D", label: "GATE D (South-East)", type: "gate", x: -102.5, z: 102.5, status: "Operational", flowRate: "95%", waitTime: "3 min", recommendation: "Under-utilized - Fast track available" },
    { id: "GATE_E", label: "GATE E (South Main)", type: "gate", x: -145, z: 0, status: "Operational", flowRate: "91%", waitTime: "5 min", recommendation: "Direct access to South Concourse & Shuttle drop-off" },
    { id: "GATE_F", label: "GATE F (South-West)", type: "gate", x: -102.5, z: -102.5, status: "Operational", flowRate: "89%", waitTime: "5 min", recommendation: "Accessible step-free entry priority" },
    { id: "GATE_G", label: "GATE G (West Main)", type: "gate", x: 0, z: -125, status: "Operational", flowRate: "85%", waitTime: "7 min", recommendation: "Main Metro transit connection gate" },
    { id: "GATE_H", label: "GATE H (North-West)", type: "gate", x: 102.5, z: -102.5, status: "Operational", flowRate: "90%", waitTime: "4 min", recommendation: "Express family & staff entrance" }
];

export const WASHROOMS_DATA = [
    { id: "WC_A", label: "🚻 WC A (North Concourse)", type: "wc", x: 125.6, z: 72.5, status: "Operational", waitTime: "2 min", accessible: true },
    { id: "WC_B", label: "🚻 WC B (East Concourse)", type: "wc", x: 72.5, z: 125.6, status: "Operational", waitTime: "5 min", accessible: true },
    { id: "WC_C", label: "🚻 WC C (South-East)", type: "wc", x: -72.5, z: 125.6, status: "Down", waitTime: "OFFLINE", accessible: false, note: "Plumbing maintenance in progress" },
    { id: "WC_D", label: "🚻 WC D (South Concourse)", type: "wc", x: -125.6, z: -72.5, status: "Operational", waitTime: "3 min", accessible: true },
    { id: "WC_E", label: "🚻 WC E (West Concourse)", type: "wc", x: -72.5, z: -125.6, status: "Operational", waitTime: "4 min", accessible: true },
    { id: "WC_F", label: "🚻 WC F (North-West)", type: "wc", x: 72.5, z: -125.6, status: "Operational", waitTime: "2 min", accessible: true }
];

export const MEDICAL_DATA = [
    { id: "MED_A", label: "🏥 MEDICAL A (North-East Hub)", type: "med", x: 102.5, z: 102.5, status: "Operational", staffOnDuty: 8, bedsAvailable: 4 },
    { id: "MED_B", label: "🏥 MEDICAL B (South-East Hub)", type: "med", x: -102.5, z: 102.5, status: "Operational", staffOnDuty: 6, bedsAvailable: 5 },
    { id: "MED_C", label: "🏥 MEDICAL C (South-West Hub)", type: "med", x: -102.5, z: -102.5, status: "Operational", staffOnDuty: 7, bedsAvailable: 3 },
    { id: "MED_D", label: "🏥 MEDICAL D (North-West Hub)", type: "med", x: 102.5, z: -102.5, status: "Operational", staffOnDuty: 9, bedsAvailable: 6 }
];

export const FOOD_DATA = [
    { id: "FOOD_A", label: "🍔 FOOD A - Gourmet Burgers & Fries", type: "food", x: 145, z: 0, status: "Operational", waitTime: "4 min", rating: "4.8", menu: ["World Cup Bacon Burger", "Crispy Fries", "Craft Soda"] },
    { id: "FOOD_B", label: "🍔 FOOD B - Artisan Pizza & Pasta", type: "food", x: 102.5, z: 102.5, status: "Operational", waitTime: "8 min", rating: "4.6", menu: ["Margherita Pizza", "Pepperoni Slice", "Garlic Knots"] },
    { id: "FOOD_C", label: "🍔 FOOD C - Estadio Tacos & Nachos", type: "food", x: 0, z: 125, status: "Degraded", waitTime: "15 min", rating: "4.9", menu: ["Carne Asada Tacos", "Loaded Nachos Supreme", "Churros"] },
    { id: "FOOD_D", label: "🍔 FOOD D - Stadium Grill & Dogs", type: "food", x: -102.5, z: 102.5, status: "Operational", waitTime: "3 min", rating: "4.5", menu: ["Jumbo Bratwurst", "Classic Hot Dog", "Pretzel"] },
    { id: "FOOD_E", label: "🍔 FOOD E - Craft Beer & Snack Bar", type: "food", x: -145, z: 0, status: "Operational", waitTime: "5 min", rating: "4.7", menu: ["Local IPA Draft", "Imported Pilsner", "Warm Roasted Nuts"] },
    { id: "FOOD_F", label: "🍔 FOOD F - Tokyo Sushi & Poke Bowls", type: "food", x: -102.5, z: -102.5, status: "Operational", waitTime: "6 min", rating: "4.8", menu: ["Salmon Poke Bowl", "California Roll Combo", "Edamame"] },
    { id: "FOOD_G", label: "🍔 FOOD G - Halal & Middle Eastern", type: "food", x: 0, z: -125, status: "Operational", waitTime: "4 min", rating: "4.9", menu: ["Chicken Shawarma Wrap", "Falafel Bowl", "Baklava"] },
    { id: "FOOD_H", label: "🍔 FOOD H - Artisan Gelato & Espresso", type: "food", x: 102.5, z: -102.5, status: "Operational", waitTime: "3 min", rating: "4.7", menu: ["Gelato 3-Scoop Cone", "Iced Caramel Macchiato", "Brownie"] }
];

export const ALL_FACILITIES = [...GATES_DATA, ...WASHROOMS_DATA, ...MEDICAL_DATA, ...FOOD_DATA];

// Simulate Block Occupancy percentages for Control Room Density Heatmap
export const BLOCK_DENSITY_DATA = {};
for (let i = 1; i <= 36; i++) {
    const blockNum = i.toString().padStart(2, '0');
    const lowerId = `B${blockNum}-L`;
    const upperId = `B${blockNum}-U`;
    
    // Create interesting hotspot distribution (e.g. East Blocks around Gate C have high density)
    let baseLower = 72 + Math.floor(Math.sin(i * 0.5) * 18);
    let baseUpper = 55 + Math.floor(Math.cos(i * 0.5) * 20);
    
    if (i >= 10 && i <= 15) { // East side surge near Gate C
        baseLower = Math.min(98, baseLower + 20);
        baseUpper = Math.min(92, baseUpper + 18);
    }
    
    BLOCK_DENSITY_DATA[lowerId] = {
        density: Math.min(98, Math.max(40, baseLower)),
        tier: "Lower",
        status: baseLower > 90 ? "SURGE" : baseLower > 75 ? "ELEVATED" : "NORMAL",
        capacity: 1100,
        current: Math.floor(1100 * (baseLower / 100))
    };
    
    BLOCK_DENSITY_DATA[upperId] = {
        density: Math.min(95, Math.max(35, baseUpper)),
        tier: "Upper",
        status: baseUpper > 90 ? "SURGE" : baseUpper > 75 ? "ELEVATED" : "NORMAL",
        capacity: 800,
        current: Math.floor(800 * (baseUpper / 100))
    };
}

// Ensure specific demo block B14-L and B12-L stand out for Wayfinding / Surge alerts
BLOCK_DENSITY_DATA["B12-L"].density = 94;
BLOCK_DENSITY_DATA["B12-L"].status = "SURGE";
BLOCK_DENSITY_DATA["B14-L"].density = 88;
BLOCK_DENSITY_DATA["B14-L"].status = "ELEVATED";

export const TRANSPORTATION_DATA = [
    {
        id: "trans_metro",
        type: "METRO / SUBWAY",
        name: "Metro Red Line (Olympic Stadium Station)",
        status: "RUNNING ON TIME",
        statusColor: "text-green-400 bg-green-400/10 border-green-500/30",
        nextArrivals: ["4 min", "9 min", "14 min"],
        dropoffGate: "GATE_G",
        dropoffGateLabel: "GATE G (West Main)",
        description: "High-capacity express trains running every 5 minutes to downtown central."
    },
    {
        id: "trans_shuttle",
        type: "EXPRESS SHUTTLE BUS",
        name: "FIFA Fan Festival Shuttle (Line S1)",
        status: "SLIGHT DELAYS (CROWD LOAD)",
        statusColor: "text-yellow-400 bg-yellow-400/10 border-yellow-500/30",
        nextArrivals: ["8 min", "16 min", "24 min"],
        dropoffGate: "GATE_E",
        dropoffGateLabel: "GATE E (South Main)",
        description: "Direct zero-emission electric buses connecting to Fan Plaza and South Parking."
    },
    {
        id: "trans_park_north",
        type: "PARKING ZONE",
        name: "North VIP & General Parking (P-North)",
        status: "🟢 82% AVAILABLE",
        statusColor: "text-green-400 bg-green-400/10 border-green-500/30",
        nextArrivals: ["Instant Access", "420 spots free"],
        dropoffGate: "GATE_A",
        dropoffGateLabel: "GATE A (North Main)",
        description: "Spacious multi-level structured parking with EV charging stations."
    },
    {
        id: "trans_park_south",
        type: "PARKING ZONE",
        name: "South General & Accessible Parking (P-South)",
        status: "🔴 98% FULL — SURGE",
        statusColor: "text-red-400 bg-red-400/10 border-red-500/30",
        nextArrivals: ["Only 18 spots free", "Re-routing active"],
        dropoffGate: "GATE_E",
        dropoffGateLabel: "GATE E (South Main)",
        description: "Near capacity. Drivers approaching from Highway 101 advised to divert to North Parking."
    }
];

export const AI_KNOWLEDGE_BASE = [
    {
        keywords: ["restroom", "toilet", "bathroom", "washroom", "wc"],
        response: "The nearest operational restroom from the East bowl is **WC B (East Concourse)**, approximately 65 meters away right near Gate C. It currently has a short 5-minute queue. Note that **WC C** is currently undergoing quick plumbing maintenance.",
        targetMarker: "WC_B",
        targetMarkerLabel: "WC B (East Concourse)",
        actionType: "show_marker",
        confidence: "98%"
    },
    {
        keywords: ["food", "hungry", "eat", "burger", "taco", "pizza", "beer", "drink", "snack"],
        response: "For gourmet burgers and craft beverages with the shortest current wait time (only 3-4 minutes), head to **FOOD D (Stadium Grill & Dogs)** or **FOOD A (Gourmet Burgers)**! If you're near the East concourse, note that FOOD C has a 15-min queue right now.",
        targetMarker: "FOOD_D",
        targetMarkerLabel: "FOOD D - Stadium Grill",
        actionType: "show_marker",
        confidence: "96%"
    },
    {
        keywords: ["exit", "leave", "depart", "quickest exit", "out", "end of match"],
        response: "To avoid the peak post-match departure bottleneck at Gate C, we strongly recommend exiting via **GATE D (South-East)** or **GATE G (West Main)**. Gate D has 95% flow capacity right now and connects directly to the outer ring walkway.",
        targetMarker: "GATE_D",
        targetMarkerLabel: "GATE D (South-East)",
        actionType: "show_marker",
        confidence: "97%"
    },
    {
        keywords: ["seat", "find my seat", "locate", "block", "row", "ticket"],
        response: "To locate your exact seat on the 3D map, use the **My Seat** tab right here in your navigation menu! For example, Block B14-Lower is right along the vibrant East sideline offering outstanding views of the pitch and benches.",
        targetMarker: "GATE_C",
        targetMarkerLabel: "GATE C (East Main)",
        actionType: "show_seat_tab",
        confidence: "99%"
    },
    {
        keywords: ["medical", "doctor", "help", "emergency", "first aid", "headache", "injury"],
        response: "There are four fully staffed medical hubs positioned across the concourse ring. The nearest emergency first aid station to the main concourse is **MEDICAL A (North-East Hub)** right between Gate A and Gate B. Certified paramedics are on site.",
        targetMarker: "MED_A",
        targetMarkerLabel: "MEDICAL A (North-East Hub)",
        actionType: "show_marker",
        confidence: "99%"
    },
    {
        keywords: ["accessibility", "wheelchair", "step free", "disabled", "assistance"],
        response: "Step-free concourse access is prioritized at **GATE F (South-West)** and **GATE H (North-West)**, where dedicated accessibility elevators and volunteers are ready to assist. You can also toggle Step-Free Routing under our Accessibility tab!",
        targetMarker: "GATE_F",
        targetMarkerLabel: "GATE F (South-West)",
        actionType: "show_marker",
        confidence: "98%"
    }
];

export const COMMITTEE_RECOMMENDATIONS = [
    {
        id: "rec_1",
        title: "Mitigate Gate C Entry Bottleneck (18 min Wait)",
        reasoning: "Live optical sensors report 1,420 fans queued outside Gate C with processing speed degraded by 36%. Concourse walkway between Gate C and Gate D is currently at only 28% capacity, allowing fast 3-minute transit between gates.",
        confidence: "94%",
        impact: "Reduces Gate C wait time from 18 min to ~6 min within 12 minutes.",
        actionLabel: "Redirect Fans & Deploy 12 Volunteers to Gate D",
        sourceMarker: "GATE_C",
        targetMarker: "GATE_D",
        status: "pending"
    },
    {
        id: "rec_2",
        title: "Relieve Block B12-L Crowd Surge (94% Occupancy)",
        reasoning: "Block B12-Lower is experiencing early peak concentration due to pre-match warmups directly in front of the section. Vomitory 12 concourse entry is showing slight pedestrian congestion.",
        confidence: "91%",
        impact: "Prevents vomitory blockage before opening of upper concourse concessions.",
        actionLabel: "Open Auxiliary Vomitory 13 & Assign 4 Crowd Marshals",
        sourceMarker: "GATE_A",
        targetMarker: "FOOD_C",
        status: "pending"
    },
    {
        id: "rec_3",
        title: "Emergency Plumbing Dispatch for WC C (South-East)",
        reasoning: "Washroom WC C reported offline at 19:12 due to water pressure loss. This has shifted 300+ extra visitors toward WC B, raising queue times to 5 minutes.",
        confidence: "98%",
        impact: "Restores 42 restroom stalls to operational status and normalizes East concourse flow.",
        actionLabel: "Approve Priority Maintenance Work Order #WO-4091",
        sourceMarker: "WC_C",
        targetMarker: "WC_B",
        status: "pending"
    },
    {
        id: "rec_4",
        title: "South Parking (P-South) Diversion Protocol",
        reasoning: "P-South parking structure is at 98% capacity with only 18 spaces remaining. Incoming traffic on South Approach Road is backing up toward Highway 101.",
        confidence: "96%",
        impact: "Diverts 350+ approaching vehicles to North Parking (P-North, 82% available) via dynamic digital highway signage.",
        actionLabel: "Activate Highway VMS Diversion Signs to North Zone",
        sourceMarker: "GATE_E",
        targetMarker: "GATE_A",
        status: "pending"
    }
];

export const VOLUNTEER_TASKS = [
    { id: "tsk_101", title: "Crowd Marshals at Gate C Queue", zone: "East Concourse", status: "unassigned", priority: "high", assignedTo: null },
    { id: "tsk_102", title: "Wheelchair Escort from Gate F to Block B06-L", zone: "South-West Bowl", status: "in_progress", priority: "medium", assignedTo: "Volunteer Team 4 (Marco R.)" },
    { id: "tsk_103", title: "Restock Bottled Water at Food Kiosk C", zone: "East Concourse", status: "unassigned", priority: "medium", assignedTo: null },
    { id: "tsk_104", title: "Vomitory 12 Aisles Clearance Check", zone: "Lower Tier B12", status: "in_progress", priority: "high", assignedTo: "Steward Unit 8 (Sarah T.)" },
    { id: "tsk_105", title: "VIP Convey Escort at Gate B", zone: "North-East Plaza", status: "done", priority: "low", assignedTo: "Lead Protocol Officer" },
    { id: "tsk_106", title: "Signage Placement for WC C Diversion", zone: "East Concourse", status: "unassigned", priority: "high", assignedTo: null }
];

export const INCIDENT_LOG = [
    { id: "inc_001", time: "19:42:15", level: "WARNING", title: "Gate C Processing Speed Drop", details: "Average ticket scanning wait increased beyond 15 min threshold.", zone: "GATE_C" },
    { id: "inc_002", time: "19:38:00", level: "INFO", title: "Metro Red Line Express Arrival", details: "Train #408 disembarked 1,150 fans at West Station (Gate G). Flow normal.", zone: "GATE_G" },
    { id: "inc_003", time: "19:25:40", level: "ALERT", title: "Washroom WC C Water Valve Fault", details: "Facility marked Down. Maintenance crew alerted via telemetry.", zone: "WC_C" },
    { id: "inc_004", time: "19:10:12", level: "INFO", title: "Stadium Bowl Lighting Check Complete", details: "All 4 floodlight towers running at 100% broadcast lux levels.", zone: "GATE_A" },
    { id: "inc_005", time: "18:45:00", level: "INFO", title: "Match Gates Opened to Public", details: "All 8 perimeter gates initiated live scanning protocol without issue.", zone: "GATE_A" }
];

export const SUSTAINABILITY_METRICS = {
    solarGridEfficiency: "86.4%",
    carbonSavedTodayKg: "4,280 kg CO₂",
    recyclingConcourseFullness: "64%",
    waterRecoveryRate: "92%",
    greenTransitAdoption: "78.2%",
    ecoExitTip: "Taking Metro Red Line at Gate G saves 4.2 kg CO₂ vs ride-share and bypasses 25-min parking delays!"
};

// Predictive Density Heatmaps for Time-Travel Simulation slider in Committee Control Room
export const PREDICTIVE_DENSITY_DATA = {
    "-30m": {}, // Pre-match influx (Gates & Concourse busy, bowl filling)
    "0m": {},   // Kickoff (Current live state)
    "45m": {},  // Half-time (Concourse surge, food/WC busy, bowl empty)
    "90m": {}   // Full-time exit (Exits & Lower tiers surging toward gates)
};

// Populate predictive datasets based on block coordinates
for (let i = 1; i <= 36; i++) {
    const b = i.toString().padStart(2, '0');
    const lId = `B${b}-L`, uId = `B${b}-U`;
    
    // -30m Pre-Match
    PREDICTIVE_DENSITY_DATA["-30m"][lId] = { density: Math.min(85, 30 + (i % 5) * 12), tier: "Lower" };
    PREDICTIVE_DENSITY_DATA["-30m"][uId] = { density: Math.min(65, 15 + (i % 4) * 10), tier: "Upper" };
    
    // 0m Kickoff (Copies live current base)
    PREDICTIVE_DENSITY_DATA["0m"][lId] = { density: i >= 10 && i <= 15 ? 94 : 75 + Math.floor(Math.sin(i * 0.5) * 15), tier: "Lower" };
    PREDICTIVE_DENSITY_DATA["0m"][uId] = { density: i >= 10 && i <= 15 ? 88 : 55 + Math.floor(Math.cos(i * 0.5) * 18), tier: "Upper" };

    // 45m Half-Time (Bowl empties somewhat as fans flood concourse)
    PREDICTIVE_DENSITY_DATA["45m"][lId] = { density: 45 + Math.floor(Math.sin(i) * 10), tier: "Lower" };
    PREDICTIVE_DENSITY_DATA["45m"][uId] = { density: 35 + Math.floor(Math.cos(i) * 10), tier: "Upper" };

    // 90m Full-Time Exit Surge (Lower exits near vomitories hit 95-99% crush risk if not managed)
    PREDICTIVE_DENSITY_DATA["90m"][lId] = { density: i % 3 === 0 ? 98 : 88, tier: "Lower" };
    PREDICTIVE_DENSITY_DATA["90m"][uId] = { density: 72 + Math.floor(Math.sin(i) * 15), tier: "Upper" };
}

export const GENAI_SIGNAGE_PRESETS = {
    rec_1: {
        digitalSignage: '⚡ [GATE C VMS DISPLAY]: "QUEUE ALERT — GATE C AT 18-MIN WAIT. ENTER VIA GATE D (3-MIN RIGHT WALK) FOR EXPRESS SCANNING!"',
        paAnnouncements: {
            EN: 'Attention fans near Gate C: To avoid entry queues, please proceed 100 meters south along the concourse to Gate D for immediate walk-through entry.',
            ES: 'Atención aficionados cerca de la Puerta C: Para evitar colas, diríjanse 100 metros al sur hacia la Puerta D para un acceso inmediato.',
            FR: 'Attention aux supporters près de la Porte C: Pour éviter d\'attendre, veuillez vous diriger vers la Porte D pour une entrée rapide.'
        }
    },
    rec_2: {
        digitalSignage: '⚡ [CONCOURSE EAST VMS]: "BLOCK B12 WARMUP CROWD — PLEASE USE AUXILIARY VOMITORY 13 OR VISIT FOOD COURT D BEFORE KICKOFF!"',
        paAnnouncements: {
            EN: 'Attention East Stand ticket holders: Block B12 vomitory is experiencing high volume. Please utilize auxiliary entrance 13.',
            ES: 'Atención aficionados de la Tribuna Este: El acceso al Bloque B12 tiene alta concurrencia. Por favor utilicen el acceso auxiliar 13.',
            FR: 'Attention spectateurs de la Tribune Est: L\'accès au Bloc B12 est encombré. Veuillez utiliser l\'accès auxiliaire 13.'
        }
    },
    rec_3: {
        digitalSignage: '⚡ [SOUTH-EAST CONCOURSE VMS]: "RESTROOM C TEMPORARILY OFFLINE — PLEASE USE RESTROOM B (NORTH-EAST) OR RESTROOM D (SOUTH) FOR ZERO WAIT TIMES."',
        paAnnouncements: {
            EN: 'Concourse update: Restroom C is undergoing rapid maintenance. Please use Restrooms B or D located 60 seconds along the main ring.',
            ES: 'Aviso del estadio: El Baño C está en mantenimiento rápido. Por favor utilicen los Baños B o D sobre el anillo principal.',
            FR: 'Mise à jour du stade: Les toilettes C sont en maintenance. Veuillez utiliser les toilettes B ou D situées à proximité.'
        }
    }
};
